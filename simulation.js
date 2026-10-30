'use strict';
// Exact continuous-time HP model with clamping at 0 and max HP.
// Gross damage and gross healing are reported separately; healing above max HP is wasted.
function simulate(input) {
  const maxHp = Math.max(0, input.maxHp);
  const startHp = Math.min(maxHp, Math.max(0, input.startHp));
  const regen = Math.max(0, input.regen);
  const travelDps = Math.max(0, input.travelDps);
  const attackDps = Math.max(0, input.attackDefenseDps);
  const troopDps = Math.max(0, input.troopDps);
  const travelTime = Math.max(0, input.travelTime);
  const buildingHp = Math.max(0, input.buildingHp);

  const travel = simulateSurvival(startHp, maxHp, regen, travelDps, travelTime);
  const result = {
    input: { ...input, maxHp, startHp, regen, travelDps, attackDefenseDps: attackDps, troopDps, travelTime, buildingHp },
    travel,
    attack: { time: 0, damage: 0, regen: 0, effectiveRegen: 0, wastedRegen: 0, finalHp: travel.finalHp, buildingLeft: buildingHp, destroyed: false, died: false, deathTime: null },
    totalTime: travelTime,
    success: false,
    status: 'failed'
  };

  if (travel.died) {
    result.totalTime = travel.deathTime;
    result.status = 'died-travel';
    return result;
  }
  if (buildingHp <= 0) {
    result.attack.destroyed = true;
    result.attack.buildingLeft = 0;
    result.success = true;
    result.status = 'success';
    return result;
  }
  if (troopDps <= 0) {
    result.status = 'no-troop-dps';
    return result;
  }

  const destroyTime = buildingHp / troopDps;
  const attack = simulateAttack(travel.finalHp, maxHp, regen, attackDps, destroyTime);
  result.attack = { ...attack, buildingLeft: attack.died ? Math.max(0, buildingHp - troopDps * attack.time) : 0, destroyed: !attack.died, deathTime: attack.died ? attack.time : null };
  result.totalTime = travelTime + attack.time;
  result.success = !attack.died;
  result.status = attack.died ? 'died-attack' : 'success';
  return result;
}

function simulateSurvival(initialHp, maxHp, regen, defenseDps, duration) {
  const damage = defenseDps * duration;
  const healing = regen * duration;
  if (initialHp <= 0) return { time: 0, damage: 0, regen: 0, effectiveRegen: 0, wastedRegen: 0, finalHp: 0, died: duration > 0, deathTime: duration > 0 ? 0 : null };
  if (duration <= 0) return { time: 0, damage: 0, regen: 0, effectiveRegen: 0, wastedRegen: 0, finalHp: initialHp, died: false, deathTime: null };

  const net = defenseDps - regen;
  if (net > 0 && initialHp / net <= duration) {
    const deathTime = initialHp / net;
    return { time: deathTime, damage: defenseDps * deathTime, regen: regen * deathTime, effectiveRegen: regen * deathTime, wastedRegen: 0, finalHp: 0, died: true, deathTime };
  }
  const finalHp = clampHp(initialHp + (regen - defenseDps) * duration, maxHp);
  const effectiveRegen = Math.max(0, finalHp - initialHp + damage);
  return { time: duration, damage, regen: healing, effectiveRegen, wastedRegen: Math.max(0, healing - effectiveRegen), finalHp, died: false, deathTime: null };
}

function simulateAttack(initialHp, maxHp, regen, defenseDps, destroyTime) {
  if (destroyTime <= 0) return { time: 0, damage: 0, regen: 0, effectiveRegen: 0, wastedRegen: 0, finalHp: initialHp, died: false };
  const net = defenseDps - regen;
  if (initialHp <= 0) return { time: 0, damage: 0, regen: 0, effectiveRegen: 0, wastedRegen: 0, finalHp: 0, died: true };
  if (net > 0 && initialHp / net <= destroyTime) {
    const time = initialHp / net;
    return { time, damage: defenseDps * time, regen: regen * time, effectiveRegen: regen * time, wastedRegen: 0, finalHp: 0, died: true };
  }
  const time = destroyTime;
  const damage = defenseDps * time;
  const healing = regen * time;
  const finalHp = clampHp(initialHp + (regen - defenseDps) * time, maxHp);
  const effectiveRegen = Math.max(0, finalHp - initialHp + damage);
  return { time, damage, regen: healing, effectiveRegen, wastedRegen: Math.max(0, healing - effectiveRegen), finalHp, died: false };
}
function clampHp(value, maxHp) { return Math.min(maxHp, Math.max(0, value)); }

if (typeof window !== 'undefined') window.CocSimulator = { simulate, simulateSurvival, simulateAttack };

if (typeof module !== 'undefined' && module.exports) module.exports = { simulate, simulateSurvival, simulateAttack };
