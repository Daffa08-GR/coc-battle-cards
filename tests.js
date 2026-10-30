'use strict';
const { simulate } = require('./simulation.js');
const queen = simulate({ troopName:'Queen', maxHp:1730, startHp:1730, regen:192, troopDps:485, targetName:'Bangunan', buildingHp:6600, travelTime:0, travelDps:0, attackDefenseDps:155 });
const checks = [
  ['Queen attack time', Math.abs(queen.attack.time - 6600/485) < 1e-9],
  ['Queen defense damage', Math.abs(queen.attack.damage - 155*(6600/485)) < 1e-8],
  ['Queen gross regen', Math.abs(queen.attack.regen - 192*(6600/485)) < 1e-8],
  ['Queen HP capped', queen.attack.finalHp === 1730],
  ['death during travel', simulate({maxHp:100,startHp:100,regen:0,troopDps:10,buildingHp:100,travelTime:20,travelDps:10,attackDefenseDps:0}).status === 'died-travel'],
  ['arrives with low HP', simulate({maxHp:100,startHp:100,regen:0,troopDps:100,buildingHp:100,travelTime:9,travelDps:10,attackDefenseDps:0}).travel.finalHp === 10],
  ['destroys building', simulate({maxHp:100,startHp:100,regen:0,troopDps:100,buildingHp:100,travelTime:0,travelDps:0,attackDefenseDps:0}).success],
  ['dies before building destroyed', simulate({maxHp:100,startHp:100,regen:0,troopDps:1,buildingHp:200,travelTime:0,travelDps:0,attackDefenseDps:10}).status === 'died-attack'],
  ['troop DPS zero', simulate({maxHp:100,startHp:100,regen:0,troopDps:0,buildingHp:100,travelTime:0,travelDps:0,attackDefenseDps:0}).status === 'no-troop-dps'],
  ['defense DPS greater than regen', simulate({maxHp:100,startHp:100,regen:2,troopDps:10,buildingHp:100,travelTime:0,travelDps:0,attackDefenseDps:5}).attack.finalHp < 100],
  ['regen greater than defense and capped', simulate({maxHp:100,startHp:100,regen:10,troopDps:10,buildingHp:100,travelTime:0,travelDps:0,attackDefenseDps:5}).attack.finalHp === 100],
  ['building HP zero', simulate({maxHp:100,startHp:100,regen:0,troopDps:0,buildingHp:0,travelTime:0,travelDps:0,attackDefenseDps:0}).success],
  ['initial HP above max', simulate({maxHp:100,startHp:150,regen:0,troopDps:10,buildingHp:10,travelTime:0,travelDps:0,attackDefenseDps:0}).travel.finalHp === 100]
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
console.log(`\n${checks.filter(x => x[1]).length}/${checks.length} checks passed.`);
if (checks.some(x => !x[1])) process.exit(1);
