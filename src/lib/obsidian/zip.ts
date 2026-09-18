function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc ^= data[i] ?? 0;
    for (let j = 0; j < 8; j += 1) {
      const bit = crc & 1;
      crc >>>= 1;
      if (bit) crc ^= 0xedb88320;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number) {
  const buf = new Uint8Array(2);
  buf[0] = value & 255;
  buf[1] = (value >>> 8) & 255;
  return buf;
}

function u32(value: number) {
  const buf = new Uint8Array(4);
  buf[0] = value & 255;
  buf[1] = (value >>> 8) & 255;
  buf[2] = (value >>> 16) & 255;
  buf[3] = (value >>> 24) & 255;
  return buf;
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function zipStore(files: Array<{ path: string; body: Uint8Array }>): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = new TextEncoder().encode(file.path);
    const crc = crc32(file.body);
    const local = concat([
      new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
      u32(crc),
      u32(file.body.length),
      u32(file.body.length),
      u16(name.length),
      u16(0),
      name,
      file.body,
    ]);
    const central = concat([
      new Uint8Array([0x50, 0x4b, 0x01, 0x02, 0x14, 0x00, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
      u32(crc),
      u32(file.body.length),
      u32(file.body.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const localBlob = concat(locals);
  const centralBlob = concat(centrals);
  const end = concat([
    new Uint8Array([0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00]),
    u16(files.length),
    u16(files.length),
    u32(centralBlob.length),
    u32(localBlob.length),
    u16(0),
  ]);
  return concat([localBlob, centralBlob, end]);
}
