

document.addEventListener('input', (e) => {
    const target = e.target;
    if (target.id === 'idNumber' || target.id === 'childID' || target.name === 'id_number') {
        // Strip non-numeric characters for validation
        const idValue = target.value.replace(/\D/g, '');

        // Only trigger validation when the full 13 digits are entered
        if (idValue.length === 13 && typeof window.validateSAID === 'function') {
            const result = window.validateSAID(idValue);

            if (result.isValid) {
                const form = target.closest('form') || document;
                const dobInput = form.querySelector('#dob, #childDOB, input[name="dob"]');
                const genderInput = form.querySelector('#gender, #childGender, select[name="gender"], input[name="gender"]');
                const countryInput = form.querySelector('#country, #childCountry, select[name="country"]');
                const raceInput = form.querySelector('#race, #childRace, input[name="race"]');

                if (dobInput) {
                    // Use the DD/MM/YYYY format for display, as requested.
                    dobInput.value = result.displayDob;
                }
                if (genderInput) genderInput.value = result.gender;
                if (countryInput && result.country) countryInput.value = result.country;
                if (raceInput) raceInput.value = result.race;

                target.classList.remove('is-invalid');
            } else {
                target.classList.add('is-invalid');
            }
        }
    }
});