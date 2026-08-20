/**
 * South African ID Validation and Extraction Utility
 * Format: YYMMDDSSSSCAZ
 */

const validateSAID = (idNumber) => {
    if (!idNumber || idNumber.length !== 13 || isNaN(idNumber)) {
        return { isValid: false, error: "ID must be 13 digits." };
    }

    // 1. Luhn Algorithm Check
    let nCheck = 0;
    let bEven = false;
    for (let n = idNumber.length - 1; n >= 0; n--) {
        let cDigit = idNumber.charAt(n);
        let nDigit = parseInt(cDigit, 10);
        if (bEven) {
            if ((nDigit *= 2) > 9) nDigit -= 9;
        }
        nCheck += nDigit;
        bEven = !bEven;
    }

    if (nCheck % 10 !== 0) {
        return { isValid: false, error: "Invalid ID checksum." };
    }

    // 2. Extract Date of Birth
    const year = idNumber.substring(0, 2);
    const month = idNumber.substring(2, 4);
    const day = idNumber.substring(4, 6);

    // Determine century (Assuming 2-digit year threshold, e.g., 24 for 2024)
    const currentYear = new Date().getFullYear() % 100;
    const century = parseInt(year) <= currentYear ? "20" : "19";
    const fullYear = century + year;

    // Basic Date validation
    const dobDate = new Date(`${fullYear}-${month}-${day}`);
    if (isNaN(dobDate.getTime())) {
        return { isValid: false, error: "Invalid date encoded in ID." };
    }

    // 3. Extract Gender
    // Digits 7-10: 0000-4999 (Female), 5000-9999 (Male)
    const genderCode = parseInt(idNumber.substring(6, 10));
    const gender = genderCode < 5000 ? "Female" : "Male";

    // 4. Extract Citizenship (11th digit: 0 = Citizen, 1 = Permanent Resident)
    const citizenshipCode = parseInt(idNumber.substring(10, 11));
    const country = citizenshipCode === 0 ? "South Africa" : "";

    // 5. Extract Race (12th digit)
    const raceCode = parseInt(idNumber.substring(11, 12));
    const raceMap = {
        0: "White",
        1: "Coloured",
        2: "Malay",
        3: "Griqua",
        4: "Chinese",
        5: "Indian",
        6: "Other Asian",
        7: "Other Coloured",
        8: "Black",
        9: "Other"
    };
    const race = raceMap[raceCode] || "";

    return {
        isValid: true,
        dob: `${fullYear}-${month}-${day}`, // Format: YYYY-MM-DD
        displayDob: `${day}/${month}/${fullYear}`, // Format: DD/MM/YYYY for display
        gender: gender,
        country: country,
        race: race
    };
};

/**
 * Example usage for auto-filling a form:
 * 
 * const handleIDChange = (e) => {
 *    const id = e.target.value;
 *    if (id.length === 13) {
 *        const result = validateSAID(id);
 *        if (result.isValid) {
 *            document.getElementById('dob_field').value = result.dob;
 *            document.getElementById('gender_field').value = result.gender;
 *        } else {
 *            console.error(result.error);
 *        }
 *    }
 * }
 */

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { validateSAID };
} else {
    // For frontend use
    window.validateSAID = validateSAID;
}