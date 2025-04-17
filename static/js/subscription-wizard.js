// Subscription Wizard Modal Navigation & Validation
(function(){
  let currentStep = 1;
  const totalSteps = 5;
  const steps = [];
  for(let i=1;i<=totalSteps;i++) steps.push(document.getElementById(`wizardStep${i}`));
  const prevBtn = document.getElementById('wizardPrev');
  const nextBtn = document.getElementById('wizardNext');
  const saveBtn = document.getElementById('wizardSave');
  const progress = document.getElementById('wizardProgress');
  const form = document.getElementById('subscriptionWizardForm');
  const reviewDiv = document.getElementById('wizardReview');

  function showStep(n) {
    steps.forEach((el,i)=>el.classList.toggle('d-none',i!==n-1));
    prevBtn.disabled = (n===1);
    nextBtn.classList.toggle('d-none', n===totalSteps);
    saveBtn.classList.toggle('d-none', n!==totalSteps);
    progress.style.width = `${n*20}%`;
    progress.setAttribute('aria-valuenow', n*20);
    if(n===totalSteps) fillReview();
  }

  function fillReview() {
    const data = new FormData(form);
    let html = '<ul class="list-group">';
    for(const [k,v] of data.entries()) {
      if(!v) continue;
      html += `<li class="list-group-item"><strong>${k}:</strong> ${v}</li>`;
    }
    html += '</ul>';
    reviewDiv.innerHTML = html;
  }

  nextBtn.addEventListener('click',function(){
    if(!validateStep(currentStep)) return;
    if(currentStep<totalSteps) {
      currentStep++;
      showStep(currentStep);
    }
  });
  prevBtn.addEventListener('click',function(){
    if(currentStep>1) {
      currentStep--;
      showStep(currentStep);
    }
  });

  function validateStep(step) {
    // Simple validation: check required inputs in current step
    const curr = steps[step-1];
    let valid = true;
    curr.querySelectorAll('input[required],select[required]').forEach(input=>{
      if(!input.value) {
        input.classList.add('is-invalid');
        valid = false;
      } else {
        input.classList.remove('is-invalid');
      }
    });
    return valid;
  }

  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(!validateStep(totalSteps)) return;
    // Submit via AJAX
    const data = Object.fromEntries(new FormData(form).entries());
    fetch('/subscriptions/add',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    }).then(r=>r.json())
    .then(resp=>{
      if(resp.success) {
        location.reload();
      } else {
        alert(resp.error||'Failed to save subscription');
      }
    }).catch(()=>{
      alert('Failed to save subscription');
    });
  });

  // Reset wizard when modal is closed
  document.getElementById('subscriptionWizardModal').addEventListener('hidden.bs.modal',function(){
    currentStep=1;showStep(1);form.reset();
    form.querySelectorAll('.is-invalid').forEach(i=>i.classList.remove('is-invalid'));
  });

  showStep(1);
})();
