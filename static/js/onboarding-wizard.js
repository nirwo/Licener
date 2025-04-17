// onboarding-wizard.js
$(document).ready(function() {
  let currentStep = 1;

  function goToStep(step) {
    $(".wizard-step").hide();
    $("#wizard-step-" + step).show();
    gsap.fromTo("#wizard-step-" + step, {opacity:0, y:40}, {opacity:1, y:0, duration:0.6, ease:"power2.out"});
  }

  // Step 1: Welcome
  $(document).on("click", ".next-step", function() {
    if(currentStep === 1) {
      // Inject Step 2
      const step2 = `<div class='wizard-step' id='wizard-step-2'>
        <div class='card shadow-lg p-4 text-center onboarding-card'>
          <h2 class='mb-3'>Review Your Email</h2>
          <p class='mb-4'>Enter your email address to gather subscription data.<br>We will never store your credentials.</p>
          <input type='email' class='form-control form-control-lg mb-3' id='user-email' placeholder='you@email.com'>
          <button class='btn btn-success btn-lg next-step'>Continue</button>
        </div>
      </div>`;
      $("#onboarding-wizard").append(step2);
      currentStep = 2;
      goToStep(2);
    } else if(currentStep === 2) {
      const email = $("#user-email").val();
      if(!email || !email.includes("@")) {
        alert("Please enter a valid email address.");
        return;
      }
      // Simulate gathering subscriptions (replace with real API call)
      $("#onboarding-wizard").append(`<div class='wizard-step' id='wizard-step-3'>
        <div class='card shadow-lg p-4 text-center onboarding-card'>
          <h2 class='mb-3'>Building Your Profile...</h2>
          <div class='spinner-border text-primary mb-3' role='status'><span class='visually-hidden'>Loading...</span></div>
          <p class='mb-2'>Gathering your subscriptions and preparing your profile.</p>
        </div>
      </div>`);
      currentStep = 3;
      goToStep(3);
      setTimeout(function() {
        // Mocked subscriptions found
        const found = [
          {service: "Netflix", plan: "Standard", price: "$15.99"},
          {service: "Spotify", plan: "Premium", price: "$9.99"},
          {service: "Adobe CC", plan: "All Apps", price: "$52.99"}
        ];
        let rows = found.map((s,i) => `<tr><td><input type='checkbox' class='form-check-input sub-pick' data-idx='${i}' checked></td><td>${s.service}</td><td>${s.plan}</td><td>${s.price}</td></tr>`).join("");
        const step4 = `<div class='wizard-step' id='wizard-step-4'>
          <div class='card shadow-lg p-4 onboarding-card'>
            <h2 class='mb-3'>Select Subscriptions to Monitor</h2>
            <p class='mb-4'>Pick the subscriptions you want Licener to monitor for you.</p>
            <div class='table-responsive'><table class='table table-hover'>
              <thead><tr><th></th><th>Service</th><th>Plan</th><th>Price</th></tr></thead>
              <tbody>${rows}</tbody>
            </table></div>
            <button class='btn btn-primary btn-lg next-step'>Next</button>
          </div>
        </div>`;
        $("#onboarding-wizard").append(step4);
        currentStep = 4;
        goToStep(4);
      }, 1800);
    } else if(currentStep === 4) {
      // Gather selected subscriptions
      let selected = [];
      $(".sub-pick:checked").each(function() {
        const idx = $(this).data("idx");
        selected.push(idx);
      });
      if(selected.length === 0) {
        alert("Please select at least one subscription to monitor.");
        return;
      }
      // Step 5: Researcher background process (mocked)
      $("#onboarding-wizard").append(`<div class='wizard-step' id='wizard-step-5'>
        <div class='card shadow-lg p-4 text-center onboarding-card'>
          <h2 class='mb-3'>Researching Vendor Pricing</h2>
          <div class='spinner-border text-success mb-3' role='status'><span class='visually-hidden'>Loading...</span></div>
          <p class='mb-2'>Our researcher is searching the web for vendor services and pricing. This will be updated in your dashboard soon!</p>
          <button class='btn btn-success btn-lg finish-onboarding mt-3'>Finish</button>
        </div>
      </div>`);
      currentStep = 5;
      goToStep(5);
    }
  });

  $(document).on("click", ".finish-onboarding", function() {
    window.location.href = "/dashboard";
  });

  // Start at step 1
  goToStep(1);
});
