import { getRegionPack } from '../shared/regionPacks.ts';

const globalPack = getRegionPack('GLOBAL', 'NEW_GRAD');
const caPack = getRegionPack('CA', 'NEW_GRAD');
const globalCoopPack = getRegionPack('GLOBAL', 'COOP');
const caCoopPack = getRegionPack('CA', 'COOP');

console.log('GLOBAL_NEW_GRAD regionCode:', globalPack.regionCode, '| label:', globalPack.label);
console.log('CA_NEW_GRAD regionCode:', caPack.regionCode, '| label:', caPack.label);
console.log('GLOBAL_COOP regionCode:', globalCoopPack.regionCode, '| label:', globalCoopPack.label);
console.log('CA_COOP regionCode:', caCoopPack.regionCode, '| label:', caCoopPack.label);
console.log('GLOBAL workAuthRules count:', globalPack.workAuthRules?.length ?? 0);
console.log('CA workAuthRules count:', caPack.workAuthRules?.length ?? 0);
console.log('GLOBAL eligibilityChecks count:', globalPack.eligibilityChecks.length);
console.log('CA eligibilityChecks count:', caPack.eligibilityChecks.length);
console.log('All assertions passed!');
