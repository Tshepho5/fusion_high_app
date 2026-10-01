/**
 * CAPS concept graph with Bayesian Knowledge Tracing and generated practice.
 * Mastery is a probability. A weak result on a later concept steps back to the
 * earlier concept it depends on. Each item uses new numbers.
 */

const P_L0 = 0.25;
const P_T = 0.12;
const P_G = 0.2;
const P_S = 0.1;
const ADVANCE_AT = 0.8;
const WEAK_BELOW = 0.65;

const PYTHAGOREAN = [
  [3, 4, 5],
  [5, 12, 13],
  [6, 8, 10],
  [8, 15, 17],
  [7, 24, 25],
  [9, 12, 15],
  [9, 40, 41],
  [20, 21, 29]
];

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(list) {
  return list[randInt(0, list.length - 1)];
}

function numericItem(prompt, answer, explanation) {
  return {
    prompt,
    answer: String(answer),
    kind: 'numeric',
    explanation
  };
}

const TEMPLATES = {
  expressions(concept) {
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    const coefficient = a + b;
    return numericItem(
      `Simplify ${a}x + ${b}x. What is the coefficient of x?`,
      coefficient,
      `${a}x and ${b}x are like terms. ${a} + ${b} = ${coefficient}, so the expression is ${coefficient}x. ${concept.note}`
    );
  },
  equations(concept) {
    const a = randInt(2, 8);
    const x = randInt(2, 9);
    const b = randInt(1, 12);
    const c = a * x + b;
    return numericItem(
      `Solve ${a}x + ${b} = ${c}. What is x?`,
      x,
      `Subtract ${b} from both sides: ${a}x = ${c - b}. Divide by ${a}: x = ${x}. ${concept.note}`
    );
  },
  factorisation(concept) {
    const p = randInt(1, 6);
    const q = randInt(p, 8);
    return numericItem(
      `x² + ${p + q}x + ${p * q} = (x + ${p})(x + ?). What is the missing number?`,
      q,
      `The numbers multiply to ${p * q} and add to ${p + q}. They are ${p} and ${q}. ${concept.note}`
    );
  },
  linear(concept) {
    const m = randInt(2, 6);
    const c = randInt(1, 8);
    const x = randInt(2, 5);
    const y = m * x + c;
    return numericItem(
      `A straight line has equation y = ${m}x + ${c}. What is y when x = ${x}?`,
      y,
      `Substitute x = ${x}: y = ${m} × ${x} + ${c} = ${y}. ${concept.note}`
    );
  },
  pythagoras(concept) {
    const [a, b, h] = pick(PYTHAGOREAN);
    return numericItem(
      `A right-angled triangle has legs ${a} cm and ${b} cm. What is the hypotenuse, in cm?`,
      h,
      `${a}² + ${b}² = ${a * a} + ${b * b} = ${h * h} = ${h}². The hypotenuse is ${h} cm. ${concept.note}`
    );
  },
  trigRatio(concept) {
    const [a, b, h] = pick(PYTHAGOREAN);
    const opposite = a;
    const hundredths = Math.round((opposite / h) * 100);
    return numericItem(
      `In a right-angled triangle the opposite side is ${opposite} and the hypotenuse is ${h}. What is sin θ, written as a decimal to 2 places?`,
      (hundredths / 100).toFixed(2),
      `sin θ = opposite / hypotenuse = ${opposite} / ${h} = ${(hundredths / 100).toFixed(2)}. ${concept.note}`
    );
  },
  trigIdentity(concept) {
    const a = randInt(2, 6);
    const b = randInt(2, 7);
    return numericItem(
      `Expand (sin θ + ${a})(sin θ + ${b}) and give the coefficient of sin θ.`,
      a + b,
      `This is the same algebra as (x + ${a})(x + ${b}). The middle term is ${a + b} sin θ. ${concept.note}`
    );
  },
  quadratic(concept) {
    const a = randInt(1, 4);
    const x = randInt(1, 5);
    const y = a * x * x;
    return numericItem(
      `For y = ${a}x², what is y when x = ${x}?`,
      y,
      `Square ${x} first (${x * x}), then multiply by ${a}: y = ${y}. ${concept.note}`
    );
  },
  compound(concept) {
    const angle = pick([30, 45, 60]);
    const known = { 30: '1/2', 45: '√2/2', 60: '√3/2' };
    return numericItem(
      `sin(90° − ${angle}°) equals cos ${angle}°. If the question asks for sin(90° − ${angle}°), which special sine does it match? Enter ${angle === 30 ? 60 : angle === 60 ? 30 : 45}.`,
      angle === 30 ? 60 : angle === 60 ? 30 : 45,
      `sin(90° − θ) = cos θ. cos ${angle}° = sin ${angle === 30 ? 60 : angle === 60 ? 30 : 45}° = ${known[angle]}. ${concept.note}`
    );
  },
  derivative(concept) {
    const n = randInt(2, 5);
    const a = randInt(2, 6);
    const x = randInt(1, 4);
    const derivativeCoeff = a * n;
    const power = n - 1;
    const value = derivativeCoeff * Math.pow(x, power);
    return numericItem(
      `y = ${a}x^${n}. What is dy/dx when x = ${x}?`,
      value,
      `Bring the power down: dy/dx = ${derivativeCoeff}x^${power}. At x = ${x}, the value is ${value}. ${concept.note}`
    );
  },
  mole(concept) {
    const mm = pick([18, 32, 44, 40, 58]);
    const n = randInt(2, 6);
    const mass = n * mm;
    return numericItem(
      `${mass} g of a substance has molar mass ${mm} g/mol. How many moles is that?`,
      n,
      `n = m / M = ${mass} / ${mm} = ${n} mol. ${concept.note}`
    );
  },
  stoich(concept) {
    const n = randInt(2, 8);
    return numericItem(
      `In 2H₂ + O₂ → 2H₂O, ${n} mol of H₂ reacts completely. How many moles of H₂O form?`,
      n,
      `The ratio of H₂ to H₂O is 2:2, so ${n} mol of H₂ produces ${n} mol of water. ${concept.note}`
    );
  },
  concentration(concept) {
    const v = pick([1, 2, 4]);
    const n = pick([1, 2, 4]);
    const c = Math.round((n / v) * 100) / 100;
    return numericItem(
      `A solution contains ${n} mol of solute in ${v} dm³. What is the concentration in mol/dm³?`,
      Number.isInteger(c) ? c : c.toFixed(2),
      `c = n / V = ${n} / ${v} = ${c} mol/dm³. ${concept.note}`
    );
  },
  accountingEquation(concept) {
    const liabilities = randInt(20, 80) * 1000;
    const equity = randInt(20, 90) * 1000;
    const assets = liabilities + equity;
    return numericItem(
      `Assets are R${assets}. Liabilities are R${liabilities}. What is owner's equity in rands?`,
      equity,
      `Assets = equity + liabilities, so equity = ${assets} − ${liabilities} = ${equity}. ${concept.note}`
    );
  },
  depreciation(concept) {
    const cost = randInt(5, 20) * 1000;
    const rate = pick([10, 15, 20]);
    const amount = cost * rate / 100;
    return numericItem(
      `Equipment cost R${cost} and the straight-line rate is ${rate}%. What is the depreciation for one year, in rands?`,
      amount,
      `Depreciation = ${cost} × ${rate} / 100 = ${amount}. ${concept.note}`
    );
  },
  markup(concept) {
    const cost = randInt(40, 180) * 10;
    const percent = pick([20, 25, 40, 50]);
    const selling = cost + (cost * percent / 100);
    return numericItem(
      `Cost price is R${cost} and the markup is ${percent}%. What is the selling price in rands?`,
      selling,
      `Markup = ${cost} × ${percent} / 100. Selling price = cost + markup = ${selling}. ${concept.note}`
    );
  },
  magnification(concept) {
    const actual = pick([2, 4, 5]);
    const magnification = pick([10, 20, 25, 40]);
    const image = actual * magnification;
    return numericItem(
      `The image size is ${image} mm and the actual specimen is ${actual} mm. What is the magnification?`,
      magnification,
      `Magnification = image size / actual size = ${image} / ${actual} = ${magnification}. ${concept.note}`
    );
  },
  dominantCount(concept) {
    const total = pick([40, 80, 100, 120]);
    const recessive = randInt(1, Math.floor(total / 4)) * 4;
    return numericItem(
      `A genetic cross produces ${total} offspring and ${recessive} show the recessive trait. How many show the dominant trait?`,
      total - recessive,
      `Dominant count = ${total} − ${recessive} = ${total - recessive}. ${concept.note}`
    );
  },
  vatAmount(concept) {
    const exclusive = randInt(20, 80) * 10;
    const vat = exclusive * 15 / 100;
    return numericItem(
      `The price excluding VAT is R${exclusive}. VAT is 15%. What is the VAT amount in rands?`,
      vat,
      `VAT = ${exclusive} × 15 / 100 = ${vat}. ${concept.note}`
    );
  },
  breakEven(concept) {
    const contribution = pick([20, 25, 40, 50]);
    const units = randInt(4, 20) * 5;
    const fixed = contribution * units;
    return numericItem(
      `Fixed costs are R${fixed} and the contribution per unit is R${contribution}. How many units is the break-even point?`,
      units,
      `Break-even units = fixed costs / contribution = ${fixed} / ${contribution} = ${units}. ${concept.note}`
    );
  },
  mapScale(concept) {
    const cm = randInt(2, 12);
    return numericItem(
      `A map uses the scale 1:100 000. The map distance is ${cm} cm. What is the ground distance in kilometres?`,
      cm,
      `1 cm represents 1 km on a 1:100 000 map, so ${cm} cm is ${cm} km. ${concept.note}`
    );
  }
};

const CONCEPTS = [
  { id: 'g9-expressions', subject: 'Mathematics', grade: 9, title: 'Algebraic expressions', prerequisites: [], template: 'expressions', note: 'Like terms have the same variable part.' },
  { id: 'g9-equations', subject: 'Mathematics', grade: 9, title: 'Linear equations', prerequisites: ['g9-expressions'], template: 'equations', note: 'Do the same operation to both sides.' },
  { id: 'g9-factorisation', subject: 'Mathematics', grade: 9, title: 'Factorisation', prerequisites: ['g9-expressions'], template: 'factorisation', note: 'Find two numbers that multiply to the constant and add to the middle coefficient.' },
  { id: 'g10-linear', subject: 'Mathematics', grade: 10, title: 'Linear functions', prerequisites: ['g9-equations'], template: 'linear', note: 'y = mx + c uses substitution from Grade 9 equations.' },
  { id: 'g10-pythagoras', subject: 'Mathematics', grade: 10, title: 'Pythagoras', prerequisites: ['g9-equations'], template: 'pythagoras', note: 'a² + b² = c² only in a right-angled triangle.' },
  { id: 'g10-trig-ratio', subject: 'Mathematics', grade: 10, title: 'Trigonometric ratios', prerequisites: ['g10-pythagoras'], template: 'trigRatio', note: 'sin θ = opposite / hypotenuse.' },
  { id: 'g11-quadratic', subject: 'Mathematics', grade: 11, title: 'Quadratic functions', prerequisites: ['g9-factorisation'], template: 'quadratic', note: 'Square the input before multiplying by the coefficient.' },
  { id: 'g11-trig', subject: 'Mathematics', grade: 11, title: 'Trigonometric expressions', prerequisites: ['g10-trig-ratio', 'g9-factorisation'], template: 'trigIdentity', note: 'A failed Grade 11 trigonometry item often comes from Grade 9 algebra, not from the angle itself.' },
  { id: 'g12-compound', subject: 'Mathematics', grade: 12, title: 'Compound angles', prerequisites: ['g11-trig'], template: 'compound', note: 'sin(90° − θ) = cos θ.' },
  { id: 'g12-derivative', subject: 'Mathematics', grade: 12, title: 'Polynomial derivatives', prerequisites: ['g11-quadratic'], template: 'derivative', note: 'Differentiate the power before you substitute x.' },
  { id: 'g10-mole', subject: 'Physical Sciences', grade: 10, title: 'The mole', prerequisites: [], template: 'mole', note: 'n = m / M.' },
  { id: 'g11-stoich', subject: 'Physical Sciences', grade: 11, title: 'Stoichiometry', prerequisites: ['g10-mole'], template: 'stoich', note: 'Use the balancing numbers as the mole ratio.' },
  { id: 'g11-concentration', subject: 'Physical Sciences', grade: 11, title: 'Concentration', prerequisites: ['g10-mole'], template: 'concentration', note: 'c = n / V, with V in dm³.' },
  { id: 'acc-g10-equation', subject: 'Accounting', grade: 10, title: 'Accounting equation', prerequisites: [], template: 'accountingEquation', note: 'Assets = equity + liabilities.' },
  { id: 'acc-g11-depreciation', subject: 'Accounting', grade: 11, title: 'Straight-line depreciation', prerequisites: ['acc-g10-equation'], template: 'depreciation', note: 'Depreciation for one year is cost multiplied by the percentage rate.' },
  { id: 'acc-g12-markup', subject: 'Accounting', grade: 12, title: 'Markup on cost', prerequisites: ['acc-g10-equation'], template: 'markup', note: 'Selling price is cost plus the markup.' },
  { id: 'ls-g10-magnification', subject: 'Life Sciences', grade: 10, title: 'Magnification', prerequisites: [], template: 'magnification', note: 'Magnification = image size / actual size.' },
  { id: 'ls-g11-dominant', subject: 'Life Sciences', grade: 11, title: 'Dominant and recessive counts', prerequisites: ['ls-g10-magnification'], template: 'dominantCount', note: 'The two trait counts add up to the total offspring.' },
  { id: 'bus-g10-vat', subject: 'Business Studies', grade: 10, title: 'VAT at 15%', prerequisites: [], template: 'vatAmount', note: 'VAT is 15% of the exclusive price.' },
  { id: 'bus-g11-breakeven', subject: 'Business Studies', grade: 11, title: 'Break-even units', prerequisites: ['bus-g10-vat'], template: 'breakEven', note: 'Break-even units = fixed costs / contribution per unit.' },
  { id: 'geo-g10-scale', subject: 'Geography', grade: 10, title: 'Map scale', prerequisites: [], template: 'mapScale', note: 'On a 1:100 000 map, 1 cm on the map is 1 km on the ground.' }
];

const byId = Object.fromEntries(CONCEPTS.map((concept) => [concept.id, concept]));

function normaliseSubject(subject) {
  const value = String(subject || '').toLowerCase();
  if (value.includes('math')) return 'Mathematics';
  if (value.includes('account')) return 'Accounting';
  if (value.includes('life')) return 'Life Sciences';
  if (value.includes('business')) return 'Business Studies';
  if (value.includes('geo')) return 'Geography';
  if (value.includes('physical') || value.includes('chem') || value.includes('science')) return 'Physical Sciences';
  return 'Mathematics';
}

function conceptsFor(subject) {
  const name = normaliseSubject(subject);
  return CONCEPTS.filter((concept) => concept.subject === name);
}

function recordOf(records, conceptId) {
  return records[conceptId] || { p_mastery: P_L0, attempts: 0, correct_count: 0 };
}

function updateMastery(prior, correct) {
  const pL = typeof prior === 'number' ? prior : P_L0;
  const posterior = correct
    ? (pL * (1 - P_S)) / (pL * (1 - P_S) + (1 - pL) * P_G)
    : (pL * P_S) / (pL * P_S + (1 - pL) * (1 - P_G));
  const next = posterior + (1 - posterior) * P_T;
  return Math.max(0.01, Math.min(0.99, next));
}

function weakestPrerequisite(concept, records, { onlyAttempted = false } = {}) {
  let weakest = null;
  for (const id of concept.prerequisites) {
    const row = recordOf(records, id);
    if (onlyAttempted && row.attempts < 1) continue;
    if (row.p_mastery >= WEAK_BELOW) continue;
    const earlier = byId[id].grade < (weakest?.concept.grade || 99);
    if (!weakest || row.p_mastery < weakest.mastery || (row.p_mastery === weakest.mastery && earlier)) {
      weakest = { concept: byId[id], mastery: row.p_mastery, attempts: row.attempts };
    }
  }
  return weakest;
}

function startingConcept(subject, grade) {
  const list = conceptsFor(subject);
  const eligible = list.filter((concept) => concept.grade <= Number(grade || 11));
  return eligible[eligible.length - 1] || list[0];
}

function chooseConcept(subject, grade, records, { afterMissId = null } = {}) {
  const list = conceptsFor(subject);
  let current = afterMissId && byId[afterMissId] ? byId[afterMissId] : startingConcept(subject, grade);
  if (current.subject !== normaliseSubject(subject)) current = startingConcept(subject, grade);

  const currentRow = recordOf(records, current.id);
  if (currentRow.p_mastery >= ADVANCE_AT && currentRow.attempts > 0) {
    const forward = list.find((concept) => concept.prerequisites.includes(current.id) && recordOf(records, concept.id).p_mastery < ADVANCE_AT);
    if (forward) current = forward;
  }

  const missed = Boolean(afterMissId);
  const gap = weakestPrerequisite(current, records, { onlyAttempted: !missed });
  if (gap && (missed || currentRow.p_mastery < ADVANCE_AT)) {
    return {
      concept: gap.concept,
      steppedBack: true,
      from: current,
      reason: `Grade ${current.grade} ${current.title} depends on Grade ${gap.concept.grade} ${gap.concept.title}. Mastery there is ${Math.round(gap.mastery * 100)}%, so the next item steps back.`
    };
  }

  return {
    concept: current,
    steppedBack: false,
    from: null,
    reason: currentRow.attempts
      ? `Mastery of ${current.title} is ${Math.round(currentRow.p_mastery * 100)}%. This is a new variation of the same concept.`
      : `This is the Grade ${current.grade} concept on your CAPS path. A miss here can move you back to an earlier idea.`
  };
}

function generateItem(concept) {
  const template = TEMPLATES[concept.template];
  if (!template) throw new Error(`No generator for ${concept.id}`);
  return template(concept);
}

function answersMatch(expected, given) {
  const left = String(expected).trim().toLowerCase();
  const right = String(given || '').trim().toLowerCase().replace(',', '.');
  if (left === right) return true;
  const a = Number(left);
  const b = Number(right);
  if (!Number.isNaN(a) && !Number.isNaN(b)) return Math.abs(a - b) <= 0.011;
  return false;
}

function graphView(subject, records, currentId) {
  return conceptsFor(subject).map((concept) => {
    const row = recordOf(records, concept.id);
    return {
      id: concept.id,
      title: concept.title,
      grade: concept.grade,
      mastery: row.attempts ? row.p_mastery : null,
      attempts: row.attempts,
      current: concept.id === currentId
    };
  });
}

module.exports = {
  CONCEPTS,
  P_L0,
  ADVANCE_AT,
  normaliseSubject,
  conceptsFor,
  updateMastery,
  chooseConcept,
  generateItem,
  answersMatch,
  graphView,
  byId
};
