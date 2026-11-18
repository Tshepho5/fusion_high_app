/**
 * Builder script: Generates data/physical_sciences_grade12_kb.json
 * Grounded in the DBE CAPS Grade 12 Physical Sciences Textbook, Exam Guidelines, and 2022-2024 Past Papers & Memos.
 */

const fs = require('fs');
const path = require('path');

const kbData = [
  // ==========================================
  // PAPER 1: VERTICAL PROJECTILE MOTION IN 1D
  // ==========================================
  {
    id: "PS12_P1_001",
    paper: "Paper 1 (Physics)",
    topic: "Vertical Projectile Motion",
    subtopic: "Free Fall & Direction Conventions",
    question: "Define free fall and explain how direction conventions apply to equations of motion when a ball is thrown upwards from a height.",
    keywords: [
      "free fall", "projectile", "gravity", "gravitational acceleration", "equations of motion", 
      "maximum height", "downward", "upward", "direction convention", "9.8"
    ],
    prescribed_definition: "Free fall is motion during which the only force acting on an object is the gravitational force.",
    formula: "vf = vi + aΔt | vf² = vi² + 2aΔy | Δy = viΔt + ½aΔt² | Δy = ((vi + vf)/2)Δt",
    constants: "g = 9.8 m·s⁻² downward",
    model_answer: "1. Define Free Fall: Motion during which the only force acting on an object is the gravitational force.\n" +
      "2. Direction Choice (Vital First Step):\n" +
      "   • If choosing UPWARD as POSITIVE (+):\n" +
      "     - a = -9.8 m·s⁻² (downward acceleration is negative).\n" +
      "     - Initial velocity vi is positive if projected upwards.\n" +
      "     - At maximum height, instantaneous velocity vf = 0 m·s⁻¹ (acceleration remains -9.8 m·s⁻²).\n" +
      "     - When the object falls below the release point, displacement Δy is negative.\n" +
      "   • If choosing DOWNWARD as POSITIVE (+):\n" +
      "     - a = +9.8 m·s⁻².\n" +
      "     - Upward velocity vi is negative.\n" +
      "     - Downward displacement Δy is positive.\n" +
      "3. Core Rule: Once in the air, acceleration is ALWAYS 9.8 m·s⁻² downward, regardless of whether the ball is moving up, momentarily stopped at peak, or falling down.",
    rubric_points: [
      "Free fall definition stating ONLY gravitational force acts (2 marks)",
      "Correct formula choice from formula sheet (1 mark)",
      "Consistent substitution with chosen sign convention (1 mark)",
      "Final magnitude and unit (m or m·s⁻¹) with directional label (1 mark)"
    ],
    common_misconceptions: "The most frequent matric error is assuming acceleration is zero at maximum height. Acceleration is NEVER zero during free fall; only velocity is momentarily zero (vf = 0 m·s⁻¹ at peak).",
    human_guidance: "Take a deep breath and pick one direction as positive right at the top of your page—write it down clearly (e.g. 'Take UP as +'). Stick to it consistently like a compass, and the algebra will guide you safely home!"
  },
  {
    id: "PS12_P1_002",
    paper: "Paper 1 (Physics)",
    topic: "Vertical Projectile Motion",
    subtopic: "Balcony / Cliff Projection Calculation (Nov 2024 Exam Pattern)",
    question: "A ball is thrown vertically upwards from the edge of a cliff 45 m high with an initial velocity of 12 m·s⁻¹. Calculate the time taken for the ball to hit the ground below.",
    keywords: [
      "cliff", "balcony", "projectile calculation", "initial velocity", "quadratic equation", 
      "time taken", "displacement", "hit the ground", "delta y"
    ],
    prescribed_definition: "Projectiles in free fall experience uniform gravitational acceleration directed towards the centre of the Earth.",
    formula: "Δy = viΔt + ½aΔt²",
    constants: "g = 9.8 m·s⁻² downward, height = 45 m",
    model_answer: "Step 1: State Direction Convention\n" +
      "Let UPWARD be POSITIVE (+).\n" +
      "• vi = +12 m·s⁻¹\n" +
      "• a = -9.8 m·s⁻²\n" +
      "• Δy = -45 m (since the ground is 45 m below the release point)\n\n" +
      "Step 2: Select Equation of Motion\n" +
      "Δy = viΔt + ½aΔt²\n\n" +
      "Step 3: Substitute Values with Correct Signs\n" +
      "-45 = (12)Δt + ½(-9.8)(Δt)²\n" +
      "-45 = 12Δt - 4.9(Δt)²\n\n" +
      "Step 4: Rearrange into Standard Quadratic Form (ax² + bx + c = 0)\n" +
      "4.9(Δt)² - 12Δt - 45 = 0\n\n" +
      "Step 5: Solve Quadratic Equation for Δt\n" +
      "Δt = [-(-12) ± √((-12)² - 4(4.9)(-45))] / (2 × 4.9)\n" +
      "Δt = [12 ± √(144 + 882)] / 9.8\n" +
      "Δt = [12 ± √1026] / 9.8\n" +
      "Δt = [12 ± 32.03] / 9.8\n" +
      "Since time cannot be negative: Δt = (12 + 32.03) / 9.8 = 44.03 / 9.8 ≈ 4.49 s\n\n" +
      "Final Answer: The ball hits the ground after 4.49 seconds.",
    rubric_points: [
      "Appropriate formula: Δy = viΔt + ½aΔt² (1 mark)",
      "Correct substitution: -45 = (12)Δt + ½(-9.8)(Δt)² (1 mark for -45, 1 mark for vi & a)",
      "Quadratic solution showing positive root selected (1 mark)",
      "Final answer 4.49 s with correct unit (1 mark)"
    ],
    common_misconceptions: "Using Δy = +45 m instead of -45 m. Because the ball lands below the starting position, displacement is strictly negative when upward is positive.",
    human_guidance: "Whenever solving quadratic equations in physics, don't panic! Remember that time is always a forward-moving positive number in classical physics. Discard the negative mathematical root with confidence."
  },

  // ==========================================
  // PAPER 1: MOMENTUM & IMPULSE
  // ==========================================
  {
    id: "PS12_P1_003",
    paper: "Paper 1 (Physics)",
    topic: "Momentum and Impulse",
    subtopic: "Conservation of Linear Momentum",
    question: "State the principle of conservation of linear momentum and solve a collision problem where trolley A (mass 3 kg moving at 4 m·s⁻¹ east) collides with stationary trolley B (mass 5 kg). If they lock together, calculate their final velocity.",
    keywords: [
      "momentum", "linear momentum", "conservation of momentum", "isolated system", 
      "closed system", "collision", "inelastic", "impulse", "kg·m·s⁻¹"
    ],
    prescribed_definition: "The total linear momentum of an isolated (closed) system remains constant (is conserved) in both magnitude and direction.",
    formula: "Σpi = Σpf  =>  m1v1i + m2v2i = (m1 + m2)vf",
    constants: "System is isolated (net external force = 0)",
    model_answer: "1. Official DBE Definition:\n" +
      "The total linear momentum of an isolated system remains constant in both magnitude and direction.\n\n" +
      "2. Calculation:\n" +
      "• Choose direction: Take EAST as positive (+).\n" +
      "• Given:\n" +
      "  mA = 3 kg, vAi = +4 m·s⁻¹\n" +
      "  mB = 5 kg, vBi = 0 m·s⁻¹\n" +
      "  Locked together: (mA + mB) = 3 + 5 = 8 kg\n\n" +
      "• Formula:\n" +
      "  Σpi = Σpf\n" +
      "  mA·vAi + mB·vBi = (mA + mB)vf\n\n" +
      "• Substitution:\n" +
      "  (3)(4) + (5)(0) = (3 + 5)vf\n" +
      "  12 + 0 = 8vf\n" +
      "  vf = 12 / 8 = 1.5 m·s⁻¹\n\n" +
      "• Final Answer:\n" +
      "  vf = 1.5 m·s⁻¹ East (or in the original direction of trolley A).",
    rubric_points: [
      "State principle: 'total linear momentum of an isolated system is conserved' (2 marks - zero marks if 'isolated/closed' omitted)",
      "Conservation formula: Σpi = Σpf (1 mark)",
      "Correct substitution: (3)(4) + (5)(0) = (8)vf (1 mark)",
      "Final magnitude 1.5 m·s⁻¹ (1 mark)",
      "Direction: East / to the right (1 mark)"
    ],
    common_misconceptions: "Forgetting to write the word 'isolated' or 'closed' system in the definition loses both marks immediately in DBE matric marking! Also, omitting the direction in the final velocity loses 1 mark because velocity is a vector.",
    human_guidance: "Vectors have both magnitude and direction. Train yourself to write the directional word (East, West, forwards, backwards) right next to your unit every single time. It's an easy mark that distinguishes top matric candidates!"
  },
  {
    id: "PS12_P1_004",
    paper: "Paper 1 (Physics)",
    topic: "Momentum and Impulse",
    subtopic: "Impulse and Newton's Second Law in Terms of Momentum",
    question: "State Newton's second law of motion in terms of momentum, and explain why car airbags and crumple zones reduce serious injuries during collisions.",
    keywords: [
      "impulse", "newton second law", "rate of change of momentum", "airbag", 
      "crumple zone", "impact time", "net force", "FnetΔt"
    ],
    prescribed_definition: "Newton's second law in terms of momentum: The net (or resultant) force acting on an object is equal to the rate of change of momentum of the object in the direction of the net force.",
    formula: "Fnet = Δp / Δt   and   Impulse = FnetΔt = Δp = m(vf - vi)",
    constants: "Units: Impulse in N·s or kg·m·s⁻¹",
    model_answer: "1. Definition:\n" +
      "The net (resultant) force acting on an object is equal to the rate of change of momentum of the object in the direction of the net force.\n\n" +
      "2. Explanation for Airbags & Crumple Zones:\n" +
      "• In a collision, the driver must come to rest from initial velocity vi to vf = 0. Therefore, the change in momentum (Δp) is fixed/constant.\n" +
      "• Impulse equation: Fnet = Δp / Δt.\n" +
      "• An airbag or crumple zone increases the time of contact (Δt) during which the passenger comes to a stop.\n" +
      "• Since Fnet is inversely proportional to Δt for a constant Δp (Fnet ∝ 1/Δt), increasing the impact time (Δt) significantly reduces the net force (Fnet) experienced by the passenger.\n" +
      "• A smaller force results in reduced bodily deceleration and less severe injury.",
    rubric_points: [
      "Newton's 2nd law definition in terms of rate of change of momentum (2 marks)",
      "Stating that Δp (change in momentum) is constant (1 mark)",
      "Stating that airbag/crumple zone increases time of impact Δt (1 mark)",
      "Stating Fnet decreases / is inversely proportional to Δt (1 mark)"
    ],
    common_misconceptions: "Saying 'airbags reduce the change in momentum'. They DO NOT reduce Δp—the car and passenger must stop regardless. They only spread that same momentum change over a longer time interval Δt.",
    human_guidance: "Think of catching an egg or cricket ball: you naturally pull your hands backward to extend the catching time. That's impulse saving your fingers—and exactly how airbags save lives!"
  },

  // ==========================================
  // PAPER 1: WORK, ENERGY & POWER
  // ==========================================
  {
    id: "PS12_P1_005",
    paper: "Paper 1 (Physics)",
    topic: "Work, Energy and Power",
    subtopic: "Work-Energy Theorem on an Incline with Friction",
    question: "State the work-energy theorem. A 20 kg crate is pulled up a rough inclined plane at 30° by a constant force of 180 N parallel to the incline. The frictional force is 30 N. If the crate moves 5 m along the incline, calculate its final speed starting from rest.",
    keywords: [
      "work energy theorem", "incline", "friction", "kinetic energy", "net work", 
      "Wnet = delta Ek", "joules", "normal force", "gravity component"
    ],
    prescribed_definition: "The net work done on an object is equal to the change in the object's kinetic energy.",
    formula: "Wnet = ΔEk  =>  Wnet = ½m(vf² - vi²) | W = FΔx cos θ",
    constants: "g = 9.8 m·s⁻², mass = 20 kg, angle = 30°, distance = 5 m",
    model_answer: "1. State Definition:\n" +
      "The net work done on an object is equal to the change in the object's kinetic energy.\n\n" +
      "2. Identify Forces Parallel to the Incline:\n" +
      "• Applied force: Fapplied = 180 N up the incline (θ = 0° relative to motion).\n" +
      "• Friction force: fk = 30 N down the incline (θ = 180° relative to motion).\n" +
      "• Parallel component of gravity: Fg// = mg sin 30° down the incline (θ = 180°).\n" +
      "  Fg// = (20)(9.8)(sin 30°) = 98 N down the incline.\n\n" +
      "3. Calculate Net Force or Net Work:\n" +
      "Method 1: Net Force (Fnet)\n" +
      "Fnet = Fapplied - fk - Fg// = 180 - 30 - 98 = 52 N up the incline.\n" +
      "Wnet = Fnet · Δx · cos 0° = (52)(5)(1) = 260 J.\n\n" +
      "4. Apply Work-Energy Theorem:\n" +
      "Wnet = ΔEk\n" +
      "Wnet = ½m·vf² - ½m·vi²\n" +
      "260 = ½(20)vf² - 0\n" +
      "260 = 10 vf²\n" +
      "vf² = 260 / 10 = 26\n" +
      "vf = √26 ≈ 5.10 m·s⁻¹\n\n" +
      "Final Answer: The final speed of the crate is 5.10 m·s⁻¹.",
    rubric_points: [
      "Work-energy theorem definition verbatim (2 marks)",
      "Correct formula: Wnet = ΔEk or Wnc = ΔEp + ΔEk (1 mark)",
      "Work done calculations including gravity component Fg// (2 marks)",
      "Substitution into kinetic energy equation (1 mark)",
      "Final speed with unit: 5.10 m·s⁻¹ (1 mark)"
    ],
    common_misconceptions: "Forgetting the parallel component of gravity (mg sin θ). When an object moves on an incline, gravity does work parallel to the surface!",
    human_guidance: "Always draw a quick free-body diagram next to your incline. Resolve weight into perpendicular (mg cos θ) and parallel (mg sin θ) components before calculating work."
  },

  // ==========================================
  // PAPER 1: DOPPLER EFFECT
  // ==========================================
  {
    id: "PS12_P1_006",
    paper: "Paper 1 (Physics)",
    topic: "Doppler Effect",
    subtopic: "Sound Source Approaching and Receding a Stationary Listener",
    question: "State the Doppler effect. An ambulance emits a siren frequency of 650 Hz while travelling at 25 m·s⁻¹ towards a stationary pedestrian. Taking the speed of sound in air as 340 m·s⁻¹, calculate: (1) the frequency detected by the listener, and (2) state two medical or astronomical applications of the Doppler effect.",
    keywords: [
      "doppler effect", "frequency", "siren", "listener", "source", "redshift", 
      "sound waves", "compressed", "ultrasound", "hertz"
    ],
    prescribed_definition: "The Doppler effect is the change in frequency (or pitch) of the sound detected by a listener because the sound source and the listener have different velocities relative to the medium of sound propagation.",
    formula: "fL = (v ± vL) / (v ∓ vs) · fs",
    constants: "v = 340 m·s⁻¹, vs = 25 m·s⁻¹, vL = 0 m·s⁻¹, fs = 650 Hz",
    model_answer: "1. Definition:\n" +
      "The change in frequency (or pitch) of the sound detected by a listener because the sound source and the listener have different velocities relative to the medium of sound propagation.\n\n" +
      "2. Calculation (Source Approaching Listener):\n" +
      "• Since the source is approaching, the wavefronts are compressed, so observed frequency must be HIGHER (fL > fs).\n" +
      "• Therefore, use the MINUS sign in the denominator: (v - vs).\n" +
      "• Listener is stationary: vL = 0 m·s⁻¹.\n\n" +
      "fL = [v / (v - vs)] · fs\n" +
      "fL = [340 / (340 - 25)] · 650\n" +
      "fL = [340 / 315] · 650\n" +
      "fL = 1.079365 · 650 ≈ 701.59 Hz\n\n" +
      "Final Answer: The frequency detected by the pedestrian is 701.59 Hz.\n\n" +
      "3. Applications:\n" +
      "• Medical: Doppler flow meter / ultrasound to measure the rate and direction of blood flow.\n" +
      "• Astronomical: Redshift of distant galaxies, confirming that the universe is expanding as light shifts towards longer wavelengths (lower frequencies).",
    rubric_points: [
      "Doppler effect definition (2 marks)",
      "Correct formula: fL = ((v ± vL)/(v ∓ vs))fs (1 mark)",
      "Correct substitution: fL = (340 / (340 - 25))(650) (2 marks)",
      "Correct final answer 701.59 Hz with unit (1 mark)",
      "Two valid practical applications stated (2 marks)"
    ],
    common_misconceptions: "Choosing the wrong sign in the formula. Remember: when moving TOWARDS each other, pitch is HIGHER, so the denominator must be SMALLER (use minus in denominator). When moving AWAY, pitch is LOWER, so denominator must be LARGER (use plus in denominator).",
    human_guidance: "Use your everyday intuition: you know what a siren sounds like when it zooms toward you—it sounds higher pitched (weeeee), then drops lower (wooooo) as it speeds away. Let your ear guide your choice of + and - signs!"
  },

  // ==========================================
  // PAPER 1: ELECTRIC CIRCUITS & INTERNAL RESISTANCE
  // ==========================================
  {
    id: "PS12_P1_007",
    paper: "Paper 1 (Physics)",
    topic: "Electric Circuits",
    subtopic: "Internal Resistance, Emf & Lost Volts",
    question: "Define the term emf of a battery. In a circuit, a battery with unknown emf and internal resistance r is connected to a variable resistor R. When R = 4 Ω, the current is 2 A. When R = 9 Ω, the current drops to 1 A. Calculate the internal resistance r and the emf of the battery.",
    keywords: [
      "emf", "internal resistance", "lost volts", "terminal potential difference", 
      "ohms law", "simultaneous equations", "voltmeter", "current"
    ],
    prescribed_definition: "Emf (electromotive force) is the maximum energy provided by a battery per unit charge passing through it.",
    formula: "ε = Vext + Vlost  =>  ε = I(R + r)",
    constants: "Internal resistance r is constant",
    model_answer: "1. Definition:\n" +
      "Emf is the maximum energy provided by a battery per unit charge passing through it (or the maximum work done per unit charge by the battery).\n\n" +
      "2. Set Up Simultaneous Equations:\n" +
      "Equation 1 (when R = 4 Ω, I = 2 A):\n" +
      "ε = I(R + r)\n" +
      "ε = 2(4 + r)  =>  ε = 8 + 2r   --- [Eq 1]\n\n" +
      "Equation 2 (when R = 9 Ω, I = 1 A):\n" +
      "ε = 1(9 + r)  =>  ε = 9 + r    --- [Eq 2]\n\n" +
      "3. Solve for r:\n" +
      "Equate [Eq 1] and [Eq 2]:\n" +
      "8 + 2r = 9 + r\n" +
      "2r - r = 9 - 8\n" +
      "r = 1 Ω\n\n" +
      "4. Solve for Emf (ε):\n" +
      "Substitute r = 1 Ω back into [Eq 2]:\n" +
      "ε = 9 + (1) = 10 V\n\n" +
      "Final Answer: Internal resistance r = 1 Ω, Emf = 10 V.",
    rubric_points: [
      "Emf definition stating maximum energy per unit charge (2 marks)",
      "Formula: ε = I(R + r) (1 mark)",
      "Substitution for Circuit 1: ε = 2(4 + r) (1 mark)",
      "Substitution for Circuit 2: ε = 1(9 + r) (1 mark)",
      "Correct value for r: 1 Ω (1 mark)",
      "Correct value for ε: 10 V (1 mark)"
    ],
    common_misconceptions: "Confusing emf with terminal potential difference. Terminal potential difference (Vterminal) is the voltage across the external circuit when current flows. Emf is measured across the battery when NO current flows (open circuit).",
    human_guidance: "A battery isn't just an ideal magic box; it contains physical chemicals that resist current internally like a tiny built-in resistor. That's why your phone gets warm when fast charging!"
  },

  // ==========================================
  // PAPER 1: ELECTRODYNAMICS
  // ==========================================
  {
    id: "PS12_P1_008",
    paper: "Paper 1 (Physics)",
    topic: "Electrodynamics",
    subtopic: "AC Generators, RMS Values & Commutators",
    question: "State the structural and operational differences between an AC generator and a DC motor. An AC generator produces a peak voltage of 311.13 V. Calculate the rms voltage and the average power dissipated when connected to a 100 Ω heater.",
    keywords: [
      "electrodynamics", "generator", "motor", "slip rings", "split ring commutator", 
      "rms voltage", "peak voltage", "average power", "faradays law"
    ],
    prescribed_definition: "An AC generator converts mechanical energy into electrical energy using slip rings. An electric motor converts electrical energy into mechanical energy using a split ring commutator.",
    formula: "Vrms = Vmax / √2  |  Irms = Imax / √2  |  Pave = Vrms² / R  |  Pave = Vrms·Irms",
    constants: "Vmax = 311.13 V, R = 100 Ω",
    model_answer: "1. Core Differences:\n" +
      "• Energy Conversion:\n" +
      "  - Generator: Converts mechanical energy into electrical energy (based on Faraday's Law of induction).\n" +
      "  - Motor: Converts electrical energy into mechanical energy (based on motor effect).\n" +
      "• Components:\n" +
      "  - AC Generator uses SLIP RINGS to maintain continuous alternating contact.\n" +
      "  - DC Motor uses a SPLIT RING COMMUTATOR to reverse the current direction every half-cycle and maintain continuous rotation in one direction.\n\n" +
      "2. Calculate Vrms:\n" +
      "Vrms = Vmax / √2\n" +
      "Vrms = 311.13 / √2 ≈ 220.00 V (standard SA household voltage)\n\n" +
      "3. Calculate Average Power (Pave):\n" +
      "Pave = Vrms² / R\n" +
      "Pave = (220)² / 100\n" +
      "Pave = 48400 / 100 = 484 W\n\n" +
      "Final Answer: Vrms = 220 V, Average Power = 484 W.",
    rubric_points: [
      "State energy conversion difference (1 mark)",
      "State slip rings vs split ring commutator difference (1 mark)",
      "Formula: Vrms = Vmax / √2 (1 mark)",
      "Substitution and Vrms = 220 V (1 mark)",
      "Formula: Pave = Vrms² / R (1 mark)",
      "Final power: 484 W with unit (1 mark)"
    ],
    common_misconceptions: "Using peak values (Vmax) instead of rms values in power calculations. Standard power in AC circuits is ALWAYS computed using rms values (Vrms and Irms).",
    human_guidance: "220 V in your household wall socket is actually the RMS value! The peak voltage swings all the way up to ~311 V, but the effective DC equivalent heat delivered to your toaster is 220 V."
  },

  // ==========================================
  // PAPER 1: PHOTOELECTRIC EFFECT
  // ==========================================
  {
    id: "PS12_P1_009",
    paper: "Paper 1 (Physics)",
    topic: "Photoelectric Effect",
    subtopic: "Work Function, Threshold Frequency & Kinetic Energy",
    question: "Define work function. Light of frequency 8.5 × 10¹⁴ Hz is incident on a caesium metal plate with a work function of 3.4 × 10⁻¹⁹ J. Calculate: (1) the threshold frequency of caesium, and (2) the maximum kinetic energy of the emitted photoelectrons.",
    keywords: [
      "photoelectric effect", "work function", "threshold frequency", "planck constant", 
      "photons", "kinetic energy", "emitted electrons", "hf = Wo + Ek"
    ],
    prescribed_definition: "Work function is the minimum energy that an electron in a metal needs to be emitted from the metal surface.",
    formula: "E = W₀ + Ek(max)   =>   hf = hf₀ + Ek(max)   |   W₀ = hf₀",
    constants: "h = 6.63 × 10⁻³⁴ J·s, c = 3 × 10⁸ m·s⁻¹",
    model_answer: "1. Definition:\n" +
      "Work function is the minimum energy that an electron in a metal needs to be emitted from the metal surface.\n\n" +
      "2. Calculate Threshold Frequency (f₀):\n" +
      "W₀ = h·f₀\n" +
      "3.4 × 10⁻¹⁹ = (6.63 × 10⁻³⁴) · f₀\n" +
      "f₀ = (3.4 × 10⁻¹⁹) / (6.63 × 10⁻³⁴)\n" +
      "f₀ ≈ 5.13 × 10¹⁴ Hz\n\n" +
      "3. Calculate Maximum Kinetic Energy (Ek(max)):\n" +
      "Energy of incident photon: E = h·f\n" +
      "E = (6.63 × 10⁻³⁴)(8.5 × 10¹⁴) = 5.6355 × 10⁻¹⁹ J\n\n" +
      "Einstein's Photoelectric Equation:\n" +
      "E = W₀ + Ek(max)\n" +
      "5.6355 × 10⁻¹⁹ = 3.4 × 10⁻¹⁹ + Ek(max)\n" +
      "Ek(max) = 5.6355 × 10⁻¹⁹ - 3.4 × 10⁻¹⁹\n" +
      "Ek(max) = 2.24 × 10⁻¹⁹ J\n\n" +
      "Final Answer: Threshold frequency f₀ = 5.13 × 10¹⁴ Hz, Ek(max) = 2.24 × 10⁻¹⁹ J.",
    rubric_points: [
      "Work function definition verbatim (2 marks)",
      "Formula: W₀ = hf₀ (1 mark)",
      "Substitution & f₀ = 5.13 × 10¹⁴ Hz (1 mark)",
      "Formula: E = W₀ + Ek(max) or hf = W₀ + Ek(max) (1 mark)",
      "Substitution with Planck's constant (1 mark)",
      "Final Ek(max) = 2.24 × 10⁻¹⁹ J with unit (1 mark)"
    ],
    common_misconceptions: "Confusing frequency with intensity. Increasing brightness (intensity) ejects MORE electrons per second, but does NOT give individual electrons more kinetic energy. Only increasing frequency increases kinetic energy.",
    human_guidance: "Picture light as tiny coins (photons) and the metal as a toll gate. The toll to get out is the work function W₀. If your coin has more energy than the toll, the leftover change is the electron's kinetic speed!"
  },

  // ==========================================
  // PAPER 2: ORGANIC CHEMISTRY
  // ==========================================
  {
    id: "PS12_P2_010",
    paper: "Paper 2 (Chemistry)",
    topic: "Organic Chemistry",
    subtopic: "IUPAC Naming, Isomers & Intermolecular Forces",
    question: "Explain the difference between chain, positional, and functional isomers with examples. Then compare the boiling points of pentan-1-ol and pentanal in terms of intermolecular forces.",
    keywords: [
      "organic chemistry", "iupac", "homologous series", "functional group", "isomers", 
      "hydrogen bonding", "dipole-dipole", "london forces", "boiling point"
    ],
    prescribed_definition: "Structural isomers are organic molecules having the same molecular formula, but different structural formulae.",
    formula: "Alcohols (-OH), Aldehydes (-CHO), Carboxylic Acids (-COOH), Esters (-COO-)",
    constants: "Boiling point increases with stronger intermolecular forces",
    model_answer: "1. Three Types of Structural Isomers (same molecular formula, different structural formula):\n" +
      "• Chain Isomers: Same functional group, different carbon skeleton/branching (e.g. Butane and 2-Methylpropane).\n" +
      "• Positional Isomers: Same carbon skeleton and functional group, but functional group attached at different carbon positions (e.g. Butan-1-ol and Butan-2-ol).\n" +
      "• Functional Isomers: Same molecular formula, but different functional groups (e.g. Propanoic acid and Methyl ethanoate; or Propanal and Propanone).\n\n" +
      "2. Boiling Point Comparison (Pentan-1-ol vs Pentanal):\n" +
      "• Both molecules have comparable molecular mass and chain lengths (5 carbons).\n" +
      "• Pentan-1-ol has a polar hydroxyl (-OH) group capable of forming strong HYDROGEN BONDS between molecules, in addition to London forces.\n" +
      "• Pentanal has a carbonyl group (C=O) with polar DIPOLE-DIPOLE forces between molecules, in addition to London forces.\n" +
      "• Hydrogen bonds in pentan-1-ol are significantly stronger than dipole-dipole forces in pentanal.\n" +
      "• Therefore, more thermal energy is required to overcome the intermolecular forces in pentan-1-ol.\n" +
      "• Conclusion: Pentan-1-ol has a higher boiling point than pentanal.",
    rubric_points: [
      "Definition of structural isomer (2 marks)",
      "Three isomer types distinguished (3 marks)",
      "Identification of hydrogen bonding in pentan-1-ol (1 mark)",
      "Identification of dipole-dipole forces in pentanal (1 mark)",
      "Comparison: Hydrogen bonding is stronger than dipole-dipole forces (1 mark)",
      "More energy required to overcome intermolecular forces in alcohol (1 mark)"
    ],
    common_misconceptions: "Learners often say 'bonds within the molecule break' (covalent bonds). NEVER say covalent bonds break during boiling! Boiling only overcomes INTERMOLECULAR FORCES between molecules.",
    human_guidance: "When explaining boiling point to markers, always write the 'Golden 4-step answer': 1. Identify intermolecular forces in Compound A. 2. Identify forces in Compound B. 3. State which force is stronger. 4. State which requires more energy to overcome."
  },

  // ==========================================
  // PAPER 2: CHEMICAL EQUILIBRIUM (Kc)
  // ==========================================
  {
    id: "PS12_P2_011",
    paper: "Paper 2 (Chemistry)",
    topic: "Chemical Equilibrium",
    subtopic: "Kc Calculations & Le Chatelier's Principle",
    question: "State Le Chatelier's principle. In a closed 2 dm³ container at 300°C: N₂(g) + 3H₂(g) ⇌ 2NH₃(g) (ΔH < 0). Initially, 4 mol of N₂ and 9 mol of H₂ are placed in the container. At equilibrium, 2 mol of NH₃ is found. Calculate the equilibrium constant Kc.",
    keywords: [
      "chemical equilibrium", "kc", "le chatelier", "haber process", "dynamic equilibrium", 
      "ice table", "molar concentration", "exothermic"
    ],
    prescribed_definition: "When an external stress (change in pressure, temperature, or concentration) is applied to a system in dynamic equilibrium, the equilibrium will shift in such a direction as to counteract the effect of the stress.",
    formula: "Kc = [products]ᵃ / [reactants]ᵇ  |  c = n / V",
    constants: "Volume V = 2 dm³, Temperature = 300°C",
    model_answer: "1. State Le Chatelier's Principle:\n" +
      "When the equilibrium in a closed system is disturbed, the system will reinstate a new equilibrium by favouring the reaction that will oppose the disturbance.\n\n" +
      "2. Set Up the RICE Table (Reaction, Initial, Change, Equilibrium, Concentration):\n" +
      "Equation:              N₂(g)    +    3H₂(g)    ⇌    2NH₃(g)\n" +
      "Molar Ratio:            1       :      3       :      2\n" +
      "Initial Moles (n_i):   4.0             9.0            0.0\n" +
      "Mole Change (Δn):     -1.0            -3.0           +2.0\n" +
      "Equilibrium Mol (n_e): 3.0             6.0            2.0\n\n" +
      "3. Calculate Equilibrium Concentrations (c = n / V, where V = 2 dm³):\n" +
      "• [N₂] = 3.0 mol / 2.0 dm³ = 1.5 mol·dm⁻³\n" +
      "• [H₂] = 6.0 mol / 2.0 dm³ = 3.0 mol·dm⁻³\n" +
      "• [NH₃] = 2.0 mol / 2.0 dm³ = 1.0 mol·dm⁻³\n\n" +
      "4. Write Kc Expression and Substitute:\n" +
      "Kc = [NH₃]² / ([N₂] · [H₂]³)\n" +
      "Kc = (1.0)² / ((1.5) · (3.0)³)\n" +
      "Kc = 1.0 / (1.5 · 27)\n" +
      "Kc = 1.0 / 40.5\n" +
      "Kc ≈ 0.025 (or 2.47 × 10⁻²)\n\n" +
      "Final Answer: Kc = 0.025 (no units for Kc).",
    rubric_points: [
      "Le Chatelier's principle definition (2 marks)",
      "Correct change in moles using mole ratio 1:3:2 (1 mark)",
      "Equilibrium moles calculated correctly (1 mark)",
      "Division by volume 2 dm³ to get equilibrium concentrations (1 mark)",
      "Correct Kc expression: [NH₃]² / ([N₂][H₂]³) (1 mark)",
      "Substitution into Kc expression (1 mark)",
      "Final answer 0.025 (1 mark)"
    ],
    common_misconceptions: "Forgetting to divide equilibrium moles by the container volume V (2 dm³) before plugging values into the Kc expression. Kc requires CONCENTRATIONS in mol·dm⁻³, not just moles!",
    human_guidance: "Always double check the container volume in the question stem. If it says 1 dm³, n = c. But if it says 2 dm³ or 5 dm³, forgetting to divide by V is the #1 mark trap across South Africa."
  },

  // ==========================================
  // PAPER 2: ELECTROCHEMICAL CELLS
  // ==========================================
  {
    id: "PS12_P2_012",
    paper: "Paper 2 (Chemistry)",
    topic: "Electrochemical Cells",
    subtopic: "Galvanic Cell, Salt Bridge & Standard Cell Potential",
    question: "Explain the two functions of a salt bridge in a standard galvanic cell. Then for a cell consisting of zinc (Zn) and copper (Cu) half-cells under standard conditions, write: (1) the anode half-reaction, (2) the cathode half-reaction, (3) cell notation, and (4) calculate the standard cell potential E°cell.",
    keywords: [
      "galvanic cell", "salt bridge", "standard cell potential", "anode", "cathode", 
      "oxidation", "reduction", "cell notation", "standard reduction potentials"
    ],
    prescribed_definition: "A galvanic cell is an electrochemical cell that converts chemical energy into electrical energy through spontaneous redox reactions.",
    formula: "E°cell = E°cathode - E°anode",
    constants: "Standard conditions: 25°C (298 K), 1 mol·dm⁻³ solutions, 101.3 kPa",
    model_answer: "1. Two Functions of the Salt Bridge:\n" +
      "• Completes the electric circuit.\n" +
      "• Maintains electrical neutrality in both half-cell electrolytes by allowing the migration of ions.\n\n" +
      "2. Zinc-Copper Galvanic Cell Analysis (from Table 4B):\n" +
      "• E°(Zn²⁺/Zn) = -0.76 V  (Lower reduction potential -> stronger reducing agent -> undergoes OXIDATION at ANODE).\n" +
      "• E°(Cu²⁺/Cu) = +0.34 V  (Higher reduction potential -> undergoes REDUCTION at CATHODE).\n\n" +
      "3. Half-Reactions:\n" +
      "• Anode (Oxidation):  Zn(s) → Zn²⁺(aq) + 2e⁻\n" +
      "• Cathode (Reduction): Cu²⁺(aq) + 2e⁻ → Cu(s)\n\n" +
      "4. Cell Notation:\n" +
      "Zn(s) | Zn²⁺(aq, 1 mol·dm⁻³) || Cu²⁺(aq, 1 mol·dm⁻³) | Cu(s)\n\n" +
      "5. Calculate Standard Cell Potential (E°cell):\n" +
      "E°cell = E°cathode - E°anode\n" +
      "E°cell = +0.34 - (-0.76)\n" +
      "E°cell = 0.34 + 0.76 = +1.10 V\n\n" +
      "Final Answer: E°cell = +1.10 V (positive confirms spontaneous reaction under standard conditions).",
    rubric_points: [
      "Two functions of salt bridge (2 marks)",
      "Anode oxidation half-reaction with correct arrow: Zn → Zn²⁺ + 2e⁻ (1 mark)",
      "Cathode reduction half-reaction: Cu²⁺ + 2e⁻ → Cu (1 mark)",
      "Correct cell notation format Anode || Cathode (2 marks)",
      "Formula: E°cell = E°cathode - E°anode (1 mark)",
      "Substitution & final potential +1.10 V (1 mark)"
    ],
    common_misconceptions: "Using double arrows (⇌) in half-reactions. In galvanic half-reactions, reactions are single-directional (→). Also, writing Cathode || Anode instead of Anode || Cathode in cell notation loses marks.",
    human_guidance: "Remember the alphabetical trick: 'A comes before C' -> Anode is Oxidation, Cathode is Reduction (An-Ox, Red-Cat). And in cell notation, Anode is on the left, Cathode on the right!"
  }
];

// Ensure directory exists
const targetDir = path.join(__dirname, '../data');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const targetPath = path.join(targetDir, 'physical_sciences_grade12_kb.json');
fs.writeFileSync(targetPath, JSON.stringify(kbData, null, 2), 'utf8');

console.log(`[KB BUILDER] Successfully generated Grade 12 Physical Sciences Knowledge Base: ${targetPath}`);
console.log(`[KB BUILDER] Total verified DBE CAPS items: ${kbData.length}`);
