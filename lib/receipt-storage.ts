import {Buffer} from 'node:buffer';

// Keep each encoded row below D1's row-size limit. A 5 MB receipt uses 20 chunks.
const CHUNK_BYTES = 256 * 1024;
const MAX_BYTES = 5 * 1024 * 1024;
type Chunk = {part: number; data: string; size: number; chunk_count: number};

export function receiptStorage(database: D1Database, objects?: R2Bucket) {
  return {
    async put(key: string, bytes: ArrayBuffer, options: {httpMetadata: {contentType: string}}) {
      if (objects) return objects.put(key, bytes, options);
      if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) throw new Error('Invalid receipt size.');
      const source = Buffer.from(bytes);
      const count = Math.ceil(source.length / CHUNK_BYTES);
      const writes = [database.prepare(
        'INSERT INTO receipt_files (key,size,content_type,chunk_count,created_at) VALUES (?,?,?,?,?)',
      ).bind(key, source.length, options.httpMetadata.contentType, count, new Date().toISOString())];
      for (let part = 0; part < count; part++) {
        writes.push(database.prepare('INSERT INTO receipt_chunks (receipt_key,part,data) VALUES (?,?,?)')
          .bind(key, part, source.subarray(part * CHUNK_BYTES, (part + 1) * CHUNK_BYTES).toString('base64')));
      }
      // Metadata and chunks commit together, so interrupted writes cannot expose partial files.
      await database.batch(writes);
    },
    async get(key: string) {
      if (objects) {
        const object = await objects.get(key);
        if (object) return object;
      }
      const {results} = await database.prepare(
        'SELECT c.part,c.data,f.size,f.chunk_count FROM receipt_files f JOIN receipt_chunks c ON c.receipt_key=f.key WHERE f.key=? ORDER BY c.part',
      ).bind(key).all<Chunk>();
      if (!results.length) return null;
      const {size, chunk_count: count} = results[0];
      if (size < 1 || size > MAX_BYTES || count !== Math.ceil(size / CHUNK_BYTES) || results.length !== count) {
        throw new Error('Receipt data is incomplete.');
      }
      const body = new Uint8Array(size);
      for (let part = 0; part < count; part++) {
        const chunk = results[part];
        const decoded = Buffer.from(chunk.data, 'base64');
        if (chunk.part !== part || decoded.length !== Math.min(CHUNK_BYTES, size - part * CHUNK_BYTES)) {
          throw new Error('Receipt data is incomplete.');
        }
        body.set(decoded, part * CHUNK_BYTES);
      }
      return {body: body.buffer};
    },
    async delete(key: string) {
      if (objects) await objects.delete(key);
      await database.batch([
        database.prepare('DELETE FROM receipt_chunks WHERE receipt_key=?').bind(key),
        database.prepare('DELETE FROM receipt_files WHERE key=?').bind(key),
      ]);
    },
  };
}
