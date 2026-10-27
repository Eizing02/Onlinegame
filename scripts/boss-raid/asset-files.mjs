import catalog from '../../src/features/boss-raid/assets/catalog.json' with { type: 'json' };
export const normalizeName = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
export function assetFiles() {
  return [
    ...Object.entries(catalog.bosses).flatMap(([id,boss])=>Object.entries(catalog.bossClips).map(([key,file]) => ({ key: `${boss.visualKey}/${key}`, folder: boss.folder, generated:id!=='shadow_dragon', file: `${file}.png`, aliases: [key,file,...(catalog.bossAliases[key] ?? [])] }))),
    ...catalog.heroes.flatMap(hero => catalog.heroClips.map(clip => ({ key: `${hero}/${clip}`, folder: `heroes/${hero}`, sourceFolder: hero, file: `${clip}.png`, aliases: clip === 'idle' ? ['idle','idel'] : [clip] }))),
  ];
}
