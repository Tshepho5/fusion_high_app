/**
 * Builder script: Generates data/mathematics_grade12_kb.json
 * Grounded in the DBE CAPS Grade 12 Mathematics Teacher's Guide, Exam Guidelines, and 2022-2023 Past Papers & Memorandums.
 */

const fs = require('fs');
const path = require('path');

const kbData = [
  // ==========================================
  // PAPER 1: ALGEBRA, EQUATIONS & INEQUALITIES
  // ==========================================
  {
    id: "MATH12_P1_001",
    paper: "Paper 1 (Maths)",
    topic: "Algebra & Equations",
    subtopic: "Quadratic Equations, Surds & Inequalities",
    question: "Solve for x: 2x² - 5x - 3 = 0, and solve the inequality (x - 3)(x + 2) ≥ 0. Show all steps and critical values.",
    keywords: [
      "solve for x", "quadratic equation", "quadratic inequality", "critical values", 
      "factorise", "factors", "number line", "inequality", "brackets"
    ],
    prescribed_definition: "A quadratic equation in standard form ax² + bx + c = 0 has solutions given by factorisation or the quadratic formula x = (-b ± √(b² - 4ac)) / (2a). For inequalities, critical values divide the real number line into solution intervals.",
    formula: "x = (-b ± √(b² - 4ac)) / (2a)",
    constants: "Standard form: ax² + bx + c = 0 where a ≠ 0",
    model_answer: "PART 1: Quadratic Equation 2x² - 5x - 3 = 0\n" +
      "Step 1: Factorise into two linear binomials:\n" +
      "(2x + 1)(x - 3) = 0\n" +
      "Step 2: Apply the zero-product property:\n" +
      "2x + 1 = 0  OR  x - 3 = 0\n" +
      "x = -1/2   OR  x = 3\n\n" +
      "PART 2: Quadratic Inequality (x - 3)(x + 2) ≥ 0\n" +
      "Step 1: Identify critical values (roots where expression equals 0):\n" +
      "Critical values: x = -2 and x = 3\n" +
      "Step 2: Determine sign intervals:\n" +
      "Since the parabola opens upwards (coefficient of x² is +1) and we require ≥ 0 (positive or zero):\n" +
      "The expression is non-negative on the outer intervals.\n" +
      "Final Inequality Solution: x ≤ -2  OR  x ≥ 3\n" +
      "(Interval notation: x ∈ (-∞; -2] ∪ [3; ∞))",
    rubric_points: [
      "Correct factors: (2x + 1)(x - 3) (1 mark)",
      "Both equation roots: x = -1/2 and x = 3 (1 mark)",
      "Correct critical values for inequality: -2 and 3 (1 mark)",
      "Correct inequality intervals with OR connector: x ≤ -2 or x ≥ 3 (2 marks)"
    ],
    common_misconceptions: "In inequalities, writing -2 ≥ x ≥ 3 or combining them into a single invalid statement like 3 ≤ x ≤ -2. Also remember to reverse the inequality sign if dividing or multiplying by a negative number.",
    human_guidance: "Never rush into cross-multiplying or dividing by variables in an inequality! Always find your critical values first, sketch a small quick smiley parabola on rough paper, and look at whether the question wants above the axis (≥ 0) or below (≤ 0)."
  },

  // ==========================================
  // PAPER 1: PATTERNS, SEQUENCES & SERIES
  // ==========================================
  {
    id: "MATH12_P1_002",
    paper: "Paper 1 (Maths)",
    topic: "Sequences & Series",
    subtopic: "Arithmetic, Geometric & Infinite Series",
    question: "Given the geometric series 27 + 9 + 3 + ... calculate: (a) the 10th term, (b) the sum to infinity, and (c) the smallest value of n for which Sn > 40.49.",
    keywords: [
      "geometric series", "common ratio", "sum to infinity", "convergent", "sigma", 
      "logarithms", "general term", "Tn", "Sn", "arithmetic series"
    ],
    prescribed_definition: "A geometric series has a constant ratio r = T(k+1) / Tk. An infinite geometric series converges if and only if -1 < r < 1, with sum S∞ = a / (1 - r).",
    formula: "Tn = a·r^(n-1) | Sn = a(1 - r^n)/(1 - r) | S∞ = a/(1 - r) where -1 < r < 1",
    constants: "First term a = 27, Common ratio r = 9/27 = 1/3",
    model_answer: "Given: a = 27, r = 9/27 = 1/3\n\n" +
      "(a) Calculate T10:\n" +
      "Tn = a·r^(n-1)\n" +
      "T10 = 27 · (1/3)^(10 - 1)\n" +
      "T10 = 3³ · 3^(-9) = 3^(-6) = 1/729 ≈ 0.00137\n\n" +
      "(b) Calculate Sum to Infinity (S∞):\n" +
      "Since -1 < r < 1 (r = 1/3), the series converges.\n" +
      "S∞ = a / (1 - r)\n" +
      "S∞ = 27 / (1 - 1/3) = 27 / (2/3) = 27 · (3/2) = 81/2 = 40.5\n\n" +
      "(c) Solve for smallest n such that Sn > 40.49:\n" +
      "Sn = a(1 - r^n) / (1 - r)\n" +
      "27(1 - (1/3)^n) / (2/3) > 40.49\n" +
      "40.5 · (1 - (1/3)^n) > 40.49\n" +
      "1 - (1/3)^n > 40.49 / 40.5\n" +
      "1 - (1/3)^n > 0.999753086\n" +
      "(1/3)^n < 1 - 0.999753086 = 0.000246914\n" +
      "Take logs: n · log(1/3) < log(0.000246914)\n" +
      "Divide by log(1/3) which is negative (REVERSE inequality):\n" +
      "n > log(0.000246914) / log(1/3)\n" +
      "n > (-3.607455) / (-0.47712) ≈ 7.56\n" +
      "Since n must be a positive integer, n = 8.",
    rubric_points: [
      "Correct common ratio r = 1/3 (1 mark)",
      "Correct T10 = 1/729 or 0.00137 (1 mark)",
      "Correct S∞ formula & substitution: 27 / (1 - 1/3) = 40.5 (2 marks)",
      "Correct inequality setup for Sn > 40.49 (1 mark)",
      "Correct logarithmic manipulation with inequality sign reversal (1 mark)",
      "Final integer conclusion: n = 8 (1 mark)"
    ],
    common_misconceptions: "Forgetting to reverse the inequality sign when dividing by log(1/3) or log(r) where 0 < r < 1 (which evaluates to a negative number). Also ensure you verify the convergence condition -1 < r < 1 before calculating S∞.",
    human_guidance: "Matric examiners love testing logs inside geometric series! When dividing by log of a fraction between 0 and 1, remember log(1/3) is negative, so flip that inequality sign immediately!"
  },

  // ==========================================
  // PAPER 1: FUNCTIONS AND INVERSES
  // ==========================================
  {
    id: "MATH12_P1_003",
    paper: "Paper 1 (Maths)",
    topic: "Functions & Inverses",
    subtopic: "Parabola, Hyperbola, Exponential & Inverses",
    question: "Given f(x) = 2x² for x ≥ 0: (a) Determine the equation of the inverse f⁻¹(x). (b) State the domain and range of f⁻¹(x). (c) Explain why the restriction x ≥ 0 is necessary for f⁻¹ to be a function.",
    keywords: [
      "inverse function", "domain", "range", "vertical line test", "one-to-one", 
      "many-to-one", "parabola", "hyperbola", "reflection across y = x", "f inverse"
    ],
    prescribed_definition: "The inverse of a function f is obtained by swapping x and y (reflecting across the line y = x). A relation is a function if every input has exactly one output (passes the vertical line test). A parabola is many-to-one unless its domain is restricted.",
    formula: "Swap x and y: x = f(y) and solve for y. Reflection axis: y = x.",
    constants: "For f(x) = 2x² (x ≥ 0): Domain is x ≥ 0, Range is y ≥ 0",
    model_answer: "(a) Determine f⁻¹(x):\n" +
      "Let y = 2x² (where x ≥ 0 and y ≥ 0)\n" +
      "Interchange x and y to find the inverse:\n" +
      "x = 2y²\n" +
      "y² = x / 2\n" +
      "y = ±√(x / 2)\n" +
      "Since the original domain was x ≥ 0, the range of f⁻¹ must be y ≥ 0 (positive branch only):\n" +
      "f⁻¹(x) = √(x / 2)  or  f⁻¹(x) = √(2x) / 2\n\n" +
      "(b) State Domain and Range of f⁻¹(x):\n" +
      "Domain of f⁻¹ = Range of f: x ≥ 0  (or x ∈ [0; ∞))\n" +
      "Range of f⁻¹ = Domain of f: y ≥ 0  (or y ∈ [0; ∞))\n\n" +
      "(c) Why is x ≥ 0 necessary?\n" +
      "The unrestricted parabola y = 2x² is a many-to-one relation. Its inverse would be a one-to-many relation (y = ±√(x/2)), which fails the vertical line test and is therefore NOT a function. Restricting x ≥ 0 makes f a one-to-one function, ensuring its inverse f⁻¹ is also a valid function.",
    rubric_points: [
      "Swapping x and y: x = 2y² (1 mark)",
      "Solving for y with positive root chosen: f⁻¹(x) = √(x/2) (1 mark)",
      "Domain of f⁻¹: x ≥ 0 (1 mark)",
      "Range of f⁻¹: y ≥ 0 (1 mark)",
      "Explanation referencing one-to-one vs many-to-one or vertical line test (1 mark)"
    ],
    common_misconceptions: "Writing ±√(x/2) for the inverse function. A function cannot have two outputs for one input. You must select either the positive or negative branch based on the restricted domain of f.",
    human_guidance: "Remember: Domain of f becomes Range of f⁻¹, and Range of f becomes Domain of f⁻¹! Swapping x and y isn't just an algebraic trick; it literally swaps all coordinates across the mirror line y = x."
  },

  // ==========================================
  // PAPER 1: FINANCIAL MATHEMATICS
  // ==========================================
  {
    id: "MATH12_P1_004",
    paper: "Paper 1 (Maths)",
    topic: "Financial Mathematics",
    subtopic: "Annuities, Sinking Funds & Loan Amortisation",
    question: "Sipho buys a house and takes out a bank loan of R1,200,000 at an interest rate of 10.5% p.a. compounded monthly over 20 years. (a) Calculate his monthly repayment x. (b) Calculate his balance outstanding immediately after paying the 100th instalment.",
    keywords: [
      "present value", "future value", "annuity", "loan", "home loan", "mortgage", 
      "balance outstanding", "compounded monthly", "sinking fund", "amortisation"
    ],
    prescribed_definition: "A loan is a Present Value annuity where payments are made to amortise a debt: P = x[1 - (1 + i)^(-n)] / i. Balance outstanding can be calculated as the present value of remaining unpaid instalments or future value of loan minus future value of paid instalments.",
    formula: "P = x[1 - (1 + i)^(-n)] / i | F = x[(1 + i)^n - 1] / i | Balance = x[1 - (1 + i)^(-(n - k))] / i",
    constants: "P = 1,200,000, i = 0.105 / 12 = 0.00875 per month, n = 20 × 12 = 240 payments",
    model_answer: "Given: P = 1,200,000, i = 0.105 / 12 = 0.00875, n = 20 × 12 = 240\n\n" +
      "(a) Calculate Monthly Repayment (x):\n" +
      "P = x[1 - (1 + i)^(-n)] / i\n" +
      "1,200,000 = x[1 - (1 + 0.00875)^(-240)] / 0.00875\n" +
      "1,200,000 = x[1 - (1.00875)^(-240)] / 0.00875\n" +
      "1,200,000 · 0.00875 = x[1 - 0.123984]\n" +
      "10,500 = x[0.876016]\n" +
      "x = 10,500 / 0.876016 ≈ R11,986.08\n" +
      "Monthly repayment is R11,986.08.\n\n" +
      "(b) Calculate Balance Outstanding after 100th instalment:\n" +
      "Method: Present Value of REMAINING instalments.\n" +
      "Total instalments n = 240. Paid k = 100.\n" +
      "Remaining instalments n_rem = 240 - 100 = 140.\n" +
      "Balance = x[1 - (1 + i)^(-n_rem)] / i\n" +
      "Balance = 11,986.08 · [1 - (1.00875)^(-140)] / 0.00875\n" +
      "Balance = 11,986.08 · [1 - 0.295475] / 0.00875\n" +
      "Balance = 11,986.08 · [0.704525] / 0.00875\n" +
      "Balance ≈ R965,078.65\n" +
      "Sipho still owes R965,078.65 to the bank after 100 payments.",
    rubric_points: [
      "Correct monthly interest rate: i = 0.105 / 12 (1 mark)",
      "Correct total periods: n = 240 (1 mark)",
      "Correct substitution into Present Value formula (1 mark)",
      "Correct monthly instalment: R11,986.08 (1 mark)",
      "Remaining payments identified: 140 instalments (1 mark)",
      "Correct balance outstanding calculation: R965,078.65 (2 marks)"
    ],
    common_misconceptions: "Using Future Value formula (F) for home loans instead of Present Value (P). Remember: Loans and bursaries where money is given upfront are ALWAYS Present Value (P). Investments and savings for retirement are Future Value (F).",
    human_guidance: "When calculating balance outstanding, the fastest and cleanest method is looking FORWARD at the remaining payments! Just count how many months are left (240 - 100 = 140) and use that as -n in the Present Value formula. It avoids compounding errors completely!"
  },

  // ==========================================
  // PAPER 1: DIFFERENTIAL CALCULUS
  // ==========================================
  {
    id: "MATH12_P1_005",
    paper: "Paper 1 (Maths)",
    topic: "Differential Calculus",
    subtopic: "First Principles, Cubic Functions & Optimization",
    question: "1. Determine f'(x) from first principles if f(x) = 3x² - 2x. 2. For the cubic function g(x) = -x³ + 3x² + 9x - 27: (a) Find the coordinates of the stationary points, and (b) Find the point of inflection.",
    keywords: [
      "first principles", "derivative", "cubic function", "stationary points", 
      "turning points", "point of inflection", "optimization", "tangent", "limit as h approaches 0"
    ],
    prescribed_definition: "The derivative of f at x is defined from first principles by f'(x) = lim(h→0) [f(x + h) - f(x)] / h. Stationary points occur where f'(x) = 0. The point of inflection occurs where f''(x) = 0 (concavity changes).",
    formula: "f'(x) = lim(h→0) [f(x + h) - f(x)] / h | Power rule: d/dx(x^n) = n·x^(n-1)",
    constants: "Stationary points: g'(x) = 0 | Point of inflection: g''(x) = 0 or x = -b / (3a)",
    model_answer: "PART 1: Derivative from First Principles for f(x) = 3x² - 2x\n" +
      "Step 1: Write down definition of derivative:\n" +
      "f'(x) = lim(h→0) [f(x + h) - f(x)] / h\n" +
      "Step 2: Determine f(x + h):\n" +
      "f(x + h) = 3(x + h)² - 2(x + h) = 3(x² + 2xh + h²) - 2x - 2h = 3x² + 6xh + 3h² - 2x - 2h\n" +
      "Step 3: Subtract f(x):\n" +
      "f(x + h) - f(x) = (3x² + 6xh + 3h² - 2x - 2h) - (3x² - 2x) = 6xh + 3h² - 2h\n" +
      "Step 4: Factorise h from numerator:\n" +
      "f'(x) = lim(h→0) [h(6x + 3h - 2)] / h\n" +
      "Step 5: Cancel h (h ≠ 0) and take limit as h → 0:\n" +
      "f'(x) = lim(h→0) [6x + 3h - 2] = 6x + 3(0) - 2 = 6x - 2\n\n" +
      "PART 2: Cubic Function g(x) = -x³ + 3x² + 9x - 27\n" +
      "(a) Stationary points (set g'(x) = 0):\n" +
      "g'(x) = -3x² + 6x + 9 = 0\n" +
      "Divide by -3:\n" +
      "x² - 2x - 3 = 0\n" +
      "(x - 3)(x + 1) = 0\n" +
      "x = 3  OR  x = -1\n" +
      "Find corresponding y-values by substituting into g(x):\n" +
      "g(3) = -(3)³ + 3(3)² + 9(3) - 27 = -27 + 27 + 27 - 27 = 0 → (3; 0)\n" +
      "g(-1) = -(-1)³ + 3(-1)² + 9(-1) - 27 = 1 + 3 - 9 - 27 = -32 → (-1; -32)\n" +
      "Stationary points: (3; 0) [Local Maximum] and (-1; -32) [Local Minimum].\n\n" +
      "(b) Point of Inflection:\n" +
      "Set second derivative g''(x) = 0:\n" +
      "g''(x) = -6x + 6 = 0\n" +
      "-6x = -6 → x = 1\n" +
      "(Alternative: x = -b / (3a) = -(3) / (3(-1)) = -3 / -3 = 1)\n" +
      "Substitute x = 1 into g(x):\n" +
      "g(1) = -(1)³ + 3(1)² + 9(1) - 27 = -1 + 3 + 9 - 27 = -16\n" +
      "Point of inflection: (1; -16).",
    rubric_points: [
      "Correct formula for first principles stated with limit notation (1 mark)",
      "Correct expansion of f(x + h) (1 mark)",
      "Correct factorisation of h and cancellation (1 mark)",
      "Final derivative 6x - 2 with lim symbol removed ONLY at final step (1 mark)",
      "Derivative g'(x) = -3x² + 6x + 9 equated to 0 (1 mark)",
      "Both x-coordinates x = 3 and x = -1 (1 mark)",
      "Both turning points coordinates: (3; 0) and (-1; -32) (2 marks)",
      "Point of inflection found at x = 1 with y = -16: (1; -16) (2 marks)"
    ],
    common_misconceptions: "In first principles, dropping the 'lim h→0' notation before actually evaluating h = 0 is penalised with 1 mark in matric marking! Only drop 'lim h→0' in the final step where h is replaced by 0.",
    human_guidance: "Write 'lim h→0' religiously on every line like a guard keeping watch until the very final step where you set h = 0! For points of inflection, the formula x = -b / (3a) gives you an immediate verification tool."
  },

  // ==========================================
  // PAPER 1: PROBABILITY & COUNTING PRINCIPLES
  // ==========================================
  {
    id: "MATH12_P1_006",
    paper: "Paper 1 (Maths)",
    topic: "Probability & Counting",
    subtopic: "Independent Events, Venn Diagrams & Factorials",
    question: "1. For two events A and B, P(A) = 0.4 and P(B) = 0.5. If P(A or B) = 0.7, determine whether A and B are independent. 2. A 6-character code is formed using the letters A, B, C, D, E and digits 1, 2, 3, 4 without repetition. If the code must start with a letter and end with an even digit, calculate how many different codes can be formed.",
    keywords: [
      "probability", "independent events", "mutually exclusive", "Venn diagram", 
      "counting principle", "factorial", "permutations", "combinations", "P(A and B)"
    ],
    prescribed_definition: "Events A and B are independent if and only if P(A and B) = P(A) × P(B). Addition rule: P(A or B) = P(A) + P(B) - P(A and B). The fundamental counting principle multiplies the number of choices available for each slot.",
    formula: "P(A or B) = P(A) + P(B) - P(A and B) | Independence test: P(A and B) = P(A)·P(B)",
    constants: "Letters available: {A, B, C, D, E} (5 letters) | Digits: {1, 2, 3, 4} (4 digits, evens: 2, 4)",
    model_answer: "PART 1: Test for Independence\n" +
      "Step 1: Calculate P(A and B) using addition rule:\n" +
      "P(A or B) = P(A) + P(B) - P(A and B)\n" +
      "0.7 = 0.4 + 0.5 - P(A and B)\n" +
      "0.7 = 0.9 - P(A and B)\n" +
      "P(A and B) = 0.9 - 0.7 = 0.2\n\n" +
      "Step 2: Calculate product P(A) × P(B):\n" +
      "P(A) × P(B) = 0.4 × 0.5 = 0.20\n\n" +
      "Step 3: Compare values:\n" +
      "Since P(A and B) = 0.2 AND P(A) × P(B) = 0.2:\n" +
      "P(A and B) = P(A) × P(B)\n" +
      "Conclusion: Events A and B ARE INDEPENDENT.\n\n" +
      "PART 2: Counting Principle Code Formation\n" +
      "Total pool: 5 letters + 4 digits = 9 characters total.\n" +
      "We need a 6-character code: [Slot 1] [Slot 2] [Slot 3] [Slot 4] [Slot 5] [Slot 6]\n" +
      "Restrictions:\n" +
      "• Slot 1 (Must be a letter): 5 choices (A, B, C, D, E)\n" +
      "• Slot 6 (Must be an even digit): 2 choices (2, 4)\n" +
      "Remaining Slots (2, 3, 4, 5):\n" +
      "We have used 1 letter and 1 digit = 2 characters used from the total pool of 9.\n" +
      "Remaining available characters = 9 - 2 = 7 characters.\n" +
      "• Slot 2: 7 choices\n" +
      "• Slot 3: 6 choices\n" +
      "• Slot 4: 5 choices\n" +
      "• Slot 5: 4 choices\n\n" +
      "Total Codes = 5 × 7 × 6 × 5 × 4 × 2\n" +
      "Total Codes = 5 × 840 × 2 = 8,400 different codes.",
    rubric_points: [
      "Correct formula and calculation for P(A and B) = 0.2 (2 marks)",
      "Calculation of P(A) × P(B) = 0.2 (1 mark)",
      "Clear conclusion stating P(A and B) = P(A)·P(B) therefore independent (1 mark)",
      "Slot 1 choices = 5, Slot 6 choices = 2 (1 mark)",
      "Middle 4 slots permutation: 7 × 6 × 5 × 4 (or 7P4 = 840) (2 marks)",
      "Final product 8,400 codes (1 mark)"
    ],
    common_misconceptions: "Confusing 'independent events' with 'mutually exclusive events'. Mutually exclusive means P(A and B) = 0 (events cannot happen together). Independent means one event occurring has zero effect on the likelihood of the other.",
    human_guidance: "Always fill in the restricted slots FIRST! Here, slot 1 and slot 6 had special demands, so anchor them down first, and then let the remaining characters flow freely into the middle slots."
  },

  // ==========================================
  // PAPER 2: STATISTICS & REGRESSION
  // ==========================================
  {
    id: "MATH12_P2_001",
    paper: "Paper 2 (Maths)",
    topic: "Statistics",
    subtopic: "Bivariate Data, Regression Line & Correlation Coefficient",
    question: "A teacher records hours spent studying (x) and final exam marks % (y) for 5 learners: (2; 45), (4; 60), (5; 65), (7; 80), (8; 90). (a) Determine the equation of the least squares regression line y = a + bx. (b) State and interpret the correlation coefficient r. (c) Predict the exam mark for a learner who studies 6 hours.",
    keywords: [
      "statistics", "regression line", "least squares", "correlation coefficient", 
      "bivariate data", "scatter plot", "standard deviation", "r value", "line of best fit"
    ],
    prescribed_definition: "The least squares regression line minimizes the sum of squared vertical residuals: y = a + bx, where b is the slope and a is the y-intercept. The correlation coefficient r (-1 ≤ r ≤ 1) measures the strength and direction of the linear relationship.",
    formula: "y = a + bx | r = correlation coefficient (calculated via CASIO/SHARP stat mode: STAT → A + BX)",
    constants: "x: 2, 4, 5, 7, 8 (Mean x̄ = 5.2) | y: 45, 60, 65, 80, 90 (Mean ȳ = 68.0)",
    model_answer: "Given Data: (2; 45), (4; 60), (5; 65), (7; 80), (8; 90)\n" +
      "Using standard calculator STAT mode (A + BX):\n" +
      "n = 5\n" +
      "Σx = 26, Σy = 340, Σx² = 158, Σy² = 24,350, Σxy = 1,950\n\n" +
      "(a) Equation of Least Squares Regression Line:\n" +
      "Slope b = [nΣxy - (Σx)(Σy)] / [nΣx² - (Σx)²]\n" +
      "b = [5(1950) - (26)(340)] / [5(158) - (26)²] = [9750 - 8840] / [790 - 676] = 910 / 114 ≈ 7.9825 ≈ 7.98\n" +
      "Intercept a = ȳ - b·x̄\n" +
      "x̄ = 26 / 5 = 5.2, ȳ = 340 / 5 = 68\n" +
      "a = 68 - 7.9825(5.2) = 68 - 41.509 = 26.491 ≈ 26.49\n" +
      "Equation: ŷ = 26.49 + 7.98x  (or y = 7.98x + 26.49)\n\n" +
      "(b) Correlation Coefficient (r) & Interpretation:\n" +
      "r ≈ 0.995 (or 0.99 to 2 decimal places)\n" +
      "Interpretation: There is a very strong, positive linear correlation between hours spent studying and final examination marks.\n\n" +
      "(c) Predict mark for x = 6 hours:\n" +
      "ŷ = 26.49 + 7.98(6) = 26.49 + 47.88 = 74.37%\n" +
      "A learner studying 6 hours is predicted to achieve approximately 74.4% (or 74%).",
    rubric_points: [
      "Value of a = 26.49 (1 mark)",
      "Value of b = 7.98 (1 mark)",
      "Full regression equation stated: ŷ = 26.49 + 7.98x (1 mark)",
      "Value of r = 0.99 or 0.995 (1 mark)",
      "Interpretation: Very strong positive linear relationship (1 mark)",
      "Substitution of x = 6 and prediction ≈ 74.4% (1 mark)"
    ],
    common_misconceptions: "Mixing up 'a' and 'b'. In CASIO scientific calculators, 'a' represents the y-intercept (constant term) and 'b' represents the gradient (slope of x). Writing y = bx + a without labels can cost accuracy marks.",
    human_guidance: "Make sure you master your calculator's STAT mode (MODE 2: STAT, then 2: A+BX). Enter your coordinates into the table, press AC, then SHIFT 1 (STAT) → 5 (Reg) to read 'a', 'b', and 'r' in less than 30 seconds!"
  },

  // ==========================================
  // PAPER 2: ANALYTICAL GEOMETRY
  // ==========================================
  {
    id: "MATH12_P2_002",
    paper: "Paper 2 (Maths)",
    topic: "Analytical Geometry",
    subtopic: "Circles, Tangents & Inclination Angle",
    question: "A circle has equation x² - 6x + y² + 4y = 12. (a) Determine the centre M and radius r of the circle. (b) Show that the point P(6; 2) lies on the circle. (c) Determine the equation of the tangent to the circle at point P.",
    keywords: [
      "analytical geometry", "circle", "radius", "tangent to circle", "centre", 
      "completing the square", "perpendicular gradient", "m1 × m2 = -1", "inclination angle"
    ],
    prescribed_definition: "The standard form equation of a circle is (x - a)² + (y - b)² = r² with centre M(a; b) and radius r. A tangent to a circle is perpendicular to the radius drawn to the point of contact (m_radius × m_tangent = -1).",
    formula: "(x - a)² + (y - b)² = r² | m = (y2 - y1)/(x2 - x1) | m_tangent = -1 / m_radius | y - y1 = m(x - x1)",
    constants: "Perpendicular lines condition: m1 · m2 = -1",
    model_answer: "PART (a): Find centre M and radius r\n" +
      "Equation: x² - 6x + y² + 4y = 12\n" +
      "Complete the square for x and y:\n" +
      "(x² - 6x + 9) + (y² + 4y + 4) = 12 + 9 + 4\n" +
      "(x - 3)² + (y + 2)² = 25\n" +
      "Centre M = (3; -2)\n" +
      "Radius r = √25 = 5 units\n\n" +
      "PART (b): Verify point P(6; 2) lies on the circle\n" +
      "Substitute (6; 2) into LHS of circle equation:\n" +
      "LHS = (6 - 3)² + (2 + 2)² = (3)² + (4)² = 9 + 16 = 25\n" +
      "RHS = 25\n" +
      "Since LHS = RHS, P(6; 2) lies on the circle.\n\n" +
      "PART (c): Equation of tangent at P(6; 2)\n" +
      "Step 1: Calculate gradient of radius MP:\n" +
      "m_MP = (y_P - y_M) / (x_P - x_M) = (2 - (-2)) / (6 - 3) = (2 + 2) / 3 = 4/3\n" +
      "Step 2: Since tangent is perpendicular to radius (radius ⊥ tangent):\n" +
      "m_tangent = -1 / (4/3) = -3/4\n" +
      "Step 3: Equation of tangent line through P(6; 2):\n" +
      "y - y1 = m(x - x1)\n" +
      "y - 2 = -3/4 (x - 6)\n" +
      "y - 2 = -3/4 x + 18/4 = -3/4 x + 9/2\n" +
      "y = -3/4 x + 9/2 + 2 = -3/4 x + 13/2\n" +
      "(Standard form: 3x + 4y - 26 = 0  or  y = -0.75x + 6.5)",
    rubric_points: [
      "Completing the square for x: (x - 3)² (1 mark)",
      "Completing the square for y: (y + 2)² (1 mark)",
      "Correct centre M(3; -2) and radius r = 5 (2 marks)",
      "Verification showing LHS = 25 = RHS (1 mark)",
      "Gradient of radius m_MP = 4/3 (1 mark)",
      "Perpendicular tangent gradient m_tangent = -3/4 with geometric reason (1 mark)",
      "Final equation of tangent y = -3/4 x + 13/2 (1 mark)"
    ],
    common_misconceptions: "Forgetting to add the squared terms to BOTH sides of the equation when completing the square (12 + 9 + 4 = 25). Also always state the geometric reason 'radius ⊥ tangent' when finding the perpendicular gradient.",
    human_guidance: "A tangent is just a straight line! To find the equation of any straight line, you only ever need two things: one point on the line (P is given!) and its gradient (which is just the negative reciprocal of the radius gradient). Easy marks when broken down!"
  },

  // ==========================================
  // PAPER 2: TRIGONOMETRY
  // ==========================================
  {
    id: "MATH12_P2_003",
    paper: "Paper 2 (Maths)",
    topic: "Trigonometry",
    subtopic: "Compound Angles, Double Angles & General Solutions",
    question: "1. Prove the identity: (sin 2x) / (1 + cos 2x) = tan x. 2. Determine the general solution of the trigonometric equation: 2 cos² θ + 3 sin θ - 3 = 0.",
    keywords: [
      "trigonometry", "compound angles", "double angles", "general solution", 
      "identities", "sin 2x", "cos 2x", "tan x", "quadrants", "reference angle"
    ],
    prescribed_definition: "Trigonometric identities transform expressions between single, double, and compound angles: sin 2x = 2 sin x cos x, cos 2x = cos² x - sin² x = 2 cos² x - 1 = 1 - 2 sin² x. General solutions include the full periodic solution set (k · 360° or k · 180° where k ∈ ℤ).",
    formula: "sin 2x = 2 sin x cos x | cos 2x = 2 cos² x - 1 | sin² θ + cos² θ = 1 | tan x = sin x / cos x",
    constants: "Period of sin and cos: 360° | Period of tan: 180° | k ∈ ℤ",
    model_answer: "PART 1: Prove (sin 2x) / (1 + cos 2x) = tan x\n" +
      "Start with Left Hand Side (LHS):\n" +
      "LHS = (sin 2x) / (1 + cos 2x)\n" +
      "Substitute double angle formulas:\n" +
      "sin 2x = 2 sin x cos x\n" +
      "cos 2x = 2 cos² x - 1  (choose this version to cancel the +1 in the denominator)\n" +
      "LHS = (2 sin x cos x) / [1 + (2 cos² x - 1)]\n" +
      "LHS = (2 sin x cos x) / (2 cos² x)\n" +
      "Cancel 2 and one cos x factor (where cos x ≠ 0):\n" +
      "LHS = sin x / cos x = tan x\n" +
      "LHS = RHS. (Identity proven)\n\n" +
      "PART 2: General Solution of 2 cos² θ + 3 sin θ - 3 = 0\n" +
      "Step 1: Convert to single trigonometric ratio using cos² θ = 1 - sin² θ:\n" +
      "2(1 - sin² θ) + 3 sin θ - 3 = 0\n" +
      "2 - 2 sin² θ + 3 sin θ - 3 = 0\n" +
      "-2 sin² θ + 3 sin θ - 1 = 0\n" +
      "Multiply by -1:\n" +
      "2 sin² θ - 3 sin θ + 1 = 0\n" +
      "Step 2: Factorise quadratic:\n" +
      "(2 sin θ - 1)(sin θ - 1) = 0\n" +
      "Branch A: 2 sin θ - 1 = 0 → sin θ = 1/2\n" +
      "Reference angle: ref = arcsin(1/2) = 30°\n" +
      "Since sin is positive in Quadrants 1 and 2:\n" +
      "• Quad 1: θ = 30° + k · 360°, k ∈ ℤ\n" +
      "• Quad 2: θ = 180° - 30° + k · 360° = 150° + k · 360°, k ∈ ℤ\n\n" +
      "Branch B: sin θ - 1 = 0 → sin θ = 1\n" +
      "θ = 90° + k · 360°, k ∈ ℤ\n\n" +
      "Final General Solution: θ = 30° + k·360°  OR  θ = 150° + k·360°  OR  θ = 90° + k·360°, where k ∈ ℤ.",
    rubric_points: [
      "Substitution of sin 2x = 2 sin x cos x (1 mark)",
      "Substitution of cos 2x = 2 cos² x - 1 to cancel the 1 (1 mark)",
      "Cancellation to sin x / cos x = tan x (1 mark)",
      "Identity substitution: cos² θ = 1 - sin² θ (1 mark)",
      "Standard quadratic form in sin θ: 2 sin² θ - 3 sin θ + 1 = 0 (1 mark)",
      "Factors: (2 sin θ - 1)(sin θ - 1) = 0 (1 mark)",
      "Solutions for sin θ = 1/2: 30° + k·360° and 150° + k·360° (2 marks)",
      "Solution for sin θ = 1: 90° + k·360° (1 mark)",
      "Stating condition k ∈ ℤ (1 mark)"
    ],
    common_misconceptions: "Forgetting to write 'k ∈ ℤ' at the end of the general solution, which loses 1 mark on every South African matric paper. Also choosing the wrong double angle identity for cos 2x (use 2cos²x - 1 when +1 needs to be cancelled, and 1 - 2sin²x when a 1 - cos2x needs to be simplified).",
    human_guidance: "Notice how cos 2x has three forms on your formula sheet? Look at the terms around it like a puzzle piece. Here, the denominator had '1 + cos 2x'. Choosing '2cos²x - 1' makes the 1 - 1 = 0 instantly eliminate the constant! Strategic choice saves lines of algebra."
  },

  // ==========================================
  // PAPER 2: EUCLIDEAN GEOMETRY
  // ==========================================
  {
    id: "MATH12_P2_004",
    paper: "Paper 2 (Maths)",
    topic: "Euclidean Geometry",
    subtopic: "Circle Theorems, Proportionality & Similarity",
    question: "In circle with centre O, chord AB is subtended by ∠AOB at the centre and ∠ACB at the circumference. 1. Prove the theorem that ∠AOB = 2∠ACB. 2. In ΔPQR, line ST is drawn parallel to QR with S on PQ and T on PR. If PS = 4 cm, SQ = 6 cm, and PR = 15 cm, calculate the length of PT.",
    keywords: [
      "euclidean geometry", "circle theorems", "angle at centre", "angle at circumference", 
      "cyclic quadrilateral", "tan-chord theorem", "proportionality theorem", 
      "similar triangles", "line parallel to one side of triangle"
    ],
    prescribed_definition: "Grade 11 Circle Theorems: Angle at centre is twice angle at circumference; angle in semi-circle is 90°; opposite angles of cyclic quad are supplementary; tan-chord theorem. Grade 12 Theorems: A line drawn parallel to one side of a triangle divides the other two sides proportionally (prop theorem, line || one side of Δ). Similar triangles have equiangular corresponding angles and proportional corresponding sides.",
    formula: "∠AOB = 2∠ACB (angle at centre = 2 × angle at circumf) | PS / SQ = PT / TR (prop theorem, ST || QR)",
    constants: "Standard abbreviations: (line || one side of Δ), (∠ at centre = 2 × ∠ at circumf)",
    model_answer: "PART 1: Proof of Theorem (Angle at centre is twice angle at circumference)\n" +
      "Given: Circle with centre O and points A, B, C on circumference.\n" +
      "To Prove: ∠AOB = 2∠ACB\n" +
      "Construction: Join CO and produce line through O to point D.\n\n" +
      "Proof:\n" +
      "In ΔAOC:\n" +
      "OA = OC (radii of circle)\n" +
      "∴ ∠OAC = ∠OCA = x (angles opposite equal sides)\n" +
      "Now, ∠AOD is an exterior angle of ΔAOC:\n" +
      "∠AOD = ∠OAC + ∠OCA (ext ∠ of Δ = sum of opp int ∠s)\n" +
      "∠AOD = x + x = 2x = 2∠OCA  ... (Equation 1)\n\n" +
      "Similarly, in ΔBOC:\n" +
      "OB = OC (radii of circle)\n" +
      "∴ ∠OBC = ∠OCB = y (angles opposite equal sides)\n" +
      "∠BOD is an exterior angle of ΔBOC:\n" +
      "∠BOD = ∠OBC + ∠OCB = y + y = 2y = 2∠OCB  ... (Equation 2)\n\n" +
      "Add Equations 1 and 2:\n" +
      "∠AOB = ∠AOD + ∠BOD = 2x + 2y = 2(x + y)\n" +
      "Since ∠ACB = x + y:\n" +
      "∴ ∠AOB = 2∠ACB. (Theorem proven)\n\n" +
      "PART 2: Proportionality Calculation in ΔPQR\n" +
      "Given: ST || QR, PS = 4 cm, SQ = 6 cm, PR = 15 cm.\n" +
      "Let PT = x cm, then TR = 15 - x cm.\n" +
      "Apply Proportionality Theorem:\n" +
      "PS / SQ = PT / TR   [Reason: line || one side of Δ; ST || QR]\n" +
      "4 / 6 = x / (15 - x)\n" +
      "Simplify ratio 4/6 to 2/3:\n" +
      "2 / 3 = x / (15 - x)\n" +
      "Cross-multiply:\n" +
      "2(15 - x) = 3x\n" +
      "30 - 2x = 3x\n" +
      "5x = 30\n" +
      "x = 6 cm\n" +
      "Length of PT = 6 cm.",
    rubric_points: [
      "Correct construction line COD through centre (1 mark)",
      "Stating OA = OC (radii) therefore ∠OAC = ∠OCA (1 mark)",
      "Exterior angle of triangle step: ∠AOD = 2∠OCA (1 mark)",
      "Corresponding step for ∠BOD = 2∠OCB and concluding ∠AOB = 2∠ACB (2 marks)",
      "Correct ratio statement: PS/SQ = PT/TR (1 mark)",
      "Correct official DBE reason: line || one side of Δ (or ST || QR) (1 mark)",
      "Substitution: 4/6 = x/(15 - x) (1 mark)",
      "Final length PT = 6 cm (1 mark)"
    ],
    common_misconceptions: "Omitting the geometric reasons in brackets! In DBE marking guidelines, an answer without a reason receives ZERO marks for that step. Also remember: the formal proofs for the 6 examinable theorems (e.g. angle at centre, cyclic quad, tan-chord, proportionality, similarity) appear in every matric exam for 5-6 guaranteed marks.",
    human_guidance: "Never write a statement in Euclidean Geometry without giving its reason in brackets! Treat statement and reason like two best friends that always walk together: Statement [Reason]. If you remember to do construction first in theorem proofs, the exterior angle of a triangle does all the heavy lifting!"
  }
];

// Target directory
const targetDir = path.join(__dirname, '../data');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const targetPath = path.join(targetDir, 'mathematics_grade12_kb.json');
fs.writeFileSync(targetPath, JSON.stringify(kbData, null, 2), 'utf8');

console.log(`[SUCCESS] Compiled Grade 12 Mathematics Knowledge Base with ${kbData.length} core DBE CAPS items.`);
console.log(`Saved to: ${targetPath}`);
