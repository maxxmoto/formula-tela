document.addEventListener('DOMContentLoaded', function() {
    const steps = document.querySelectorAll('.onboarding-step');
    const progressSteps = document.querySelectorAll('.progress-step');
    let currentStep = 1;

    // Next button
    document.querySelectorAll('.next-step').forEach(btn => {
        btn.addEventListener('click', function() {
            const current = document.querySelector(`.onboarding-step[data-step="${currentStep}"]`);
            const requiredFields = current.querySelectorAll('[required]');
            let valid = true;

            requiredFields.forEach(field => {
                if (!field.value && !field.checked) {
                    valid = false;
                    field.style.borderColor = '#e2725a';
                } else {
                    field.style.borderColor = '';
                }
            });

            if (!valid) {
                alert('Пожалуйста, ответьте на все обязательные вопросы');
                return;
            }

            current.style.display = 'none';
            currentStep++;
            const next = document.querySelector(`.onboarding-step[data-step="${currentStep}"]`);
            if (next) {
                next.style.display = 'block';
                updateProgress();
            }
        });
    });

    // Prev button
    document.querySelectorAll('.prev-step').forEach(btn => {
        btn.addEventListener('click', function() {
            const current = document.querySelector(`.onboarding-step[data-step="${currentStep}"]`);
            current.style.display = 'none';
            currentStep--;
            const prev = document.querySelector(`.onboarding-step[data-step="${currentStep}"]`);
            if (prev) {
                prev.style.display = 'block';
                updateProgress();
            }
        });
    });

    function updateProgress() {
        progressSteps.forEach((step, index) => {
            const stepNum = index + 1;
            step.classList.remove('active', 'completed');
            if (stepNum === currentStep) {
                step.classList.add('active');
            } else if (stepNum < currentStep) {
                step.classList.add('completed');
            }
        });
    }

    updateProgress();

    // Checkbox for pregnancy/breastfeeding shows a notice
    document.querySelectorAll('[name="is_pregnant"], [name="is_breastfeeding"]').forEach(cb => {
        cb.addEventListener('change', function() {
            if (this.checked) {
                const notice = document.createElement('div');
                notice.className = 'alert alert-success';
                notice.textContent = 'Система адаптирует план с учетом вашего состояния. Все рекомендации будут безопасными.';
                this.closest('.step-card').appendChild(notice);
            }
        });
    });
});
