// Preserve source geometry and embedded textures while converting the legacy material.
import { readFileSync, writeFileSync } from 'node:fs';
const source = readFileSync(new URL('../public/retro_computer.glb', import.meta.url));
const jsonLength = source.readUInt32LE(12);
const model = JSON.parse(source.subarray(20, 20 + jsonLength).toString());
for (const material of model.materials) {
  const legacy = material.extensions?.KHR_materials_pbrSpecularGlossiness;
  if (!legacy) continue;
  material.pbrMetallicRoughness = { baseColorFactor: legacy.diffuseFactor, baseColorTexture: legacy.diffuseTexture, metallicFactor: 0, roughnessFactor: 1 - (legacy.glossinessFactor ?? 0) };
  delete material.extensions.KHR_materials_pbrSpecularGlossiness;
}
for (const key of ['extensionsUsed', 'extensionsRequired']) {
  if (model[key]) model[key] = model[key].filter(name => name !== 'KHR_materials_pbrSpecularGlossiness');
}
const json = Buffer.from(JSON.stringify(model));
const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
json.copy(padded);
const binaryChunks = source.subarray(20 + jsonLength);
const header = Buffer.from(source.subarray(0, 20));
header.writeUInt32LE(20 + padded.length + binaryChunks.length, 8);
header.writeUInt32LE(padded.length, 12);
writeFileSync(new URL('../public/retro_computer_fixed.glb', import.meta.url), Buffer.concat([header, padded, binaryChunks]));
