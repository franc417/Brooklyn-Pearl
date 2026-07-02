(function () {
  "use strict";

  var ROOM_NAME_TO_SLUG = {
    "The Pearl Suite": "pearl-suite",
    "Deluxe Room": "deluxe-room",
    "Penthouse": "penthouse",
  };

  document.addEventListener("DOMContentLoaded", function () {
    wireReserveLinks();
    wireAvailabilityCheck();
    wireContactForm();
  });

  // Clicking "Reserve Now →" on a room card scrolls up to the booking bar
  // and pre-selects that room type, instead of doing nothing (as before).
  function wireReserveLinks() {
    document.querySelectorAll(".room-link").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        var card = link.closest(".room-card");
        var nameEl = card && card.querySelector(".room-name");
        var slug = nameEl ? ROOM_NAME_TO_SLUG[nameEl.textContent.trim()] : null;
        var roomTypeSelect = document.getElementById("roomType");
        if (slug && roomTypeSelect) roomTypeSelect.value = slug;
        var bookingBar = document.getElementById("booking-bar");
        if (bookingBar) bookingBar.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  function wireAvailabilityCheck() {
    var btn = document.getElementById("checkAvailabilityBtn");
    var resultEl = document.getElementById("availabilityResult");
    if (!btn || !resultEl) return;

    btn.addEventListener("click", function () {
      var checkin = document.getElementById("checkin").value;
      var checkout = document.getElementById("checkout").value;
      var guests = document.getElementById("guestsCount").value;
      var roomType = document.getElementById("roomType").value;

      if (!checkin || !checkout) {
        resultEl.textContent = "Please choose your check-in and check-out dates.";
        return;
      }
      if (checkout <= checkin) {
        resultEl.textContent = "Check-out must be after check-in.";
        return;
      }

      btn.disabled = true;
      btn.textContent = "Checking…";
      resultEl.textContent = "";

      var params = new URLSearchParams({
        checkIn: checkin,
        checkOut: checkout,
        guests: guests,
        roomTypeSlug: roomType,
      });

      fetch("/api/availability?" + params.toString())
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          renderAvailability(data, { checkin: checkin, checkout: checkout, guests: guests });
        })
        .catch(function () {
          resultEl.textContent = "Something went wrong checking availability. Please try again.";
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "Check Availability";
        });
    });
  }

  function renderAvailability(data, dates) {
    var resultEl = document.getElementById("availabilityResult");
    resultEl.innerHTML = "";

    if (!data.available || !data.options || data.options.length === 0) {
      resultEl.textContent = "No rooms available for those dates — try adjusting your search.";
      return;
    }

    data.options.forEach(function (option) {
      var row = document.createElement("span");
      row.style.display = "inline-flex";
      row.style.alignItems = "center";
      row.style.gap = "0.6rem";
      row.style.marginRight = "1.2rem";

      var label = document.createElement("span");
      label.textContent =
        option.name + " — KES " + option.totalKes.toLocaleString() + " total (" + option.nights + " nights)";

      var bookBtn = document.createElement("button");
      bookBtn.type = "button";
      bookBtn.textContent = "Book";
      bookBtn.style.background = "transparent";
      bookBtn.style.border = "1px solid var(--gold-light)";
      bookBtn.style.color = "var(--gold-light)";
      bookBtn.style.padding = "0.25rem 0.7rem";
      bookBtn.style.fontSize = "0.68rem";
      bookBtn.style.letterSpacing = "0.08em";
      bookBtn.style.textTransform = "uppercase";
      bookBtn.style.cursor = "pointer";
      bookBtn.addEventListener("click", function () {
        openBookingModal({
          roomTypeId: option.roomTypeId,
          roomTypeName: option.name,
          totalKes: option.totalKes,
          checkIn: dates.checkin,
          checkOut: dates.checkout,
          guests: dates.guests,
        });
      });

      row.appendChild(label);
      row.appendChild(bookBtn);
      resultEl.appendChild(row);
    });
  }

  // A minimal guest-details modal — collects the info /api/bookings needs,
  // then redirects to Pesapal's hosted payment page.
  function openBookingModal(details) {
    var existing = document.getElementById("bpr-booking-modal");
    if (existing) existing.remove();

    var overlay = document.createElement("div");
    overlay.id = "bpr-booking-modal";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(20,20,12,0.75);z-index:2000;display:flex;align-items:center;justify-content:center;padding:1.5rem;";

    var modal = document.createElement("div");
    modal.style.cssText =
      "background:var(--white);max-width:420px;width:100%;padding:2.2rem;position:relative;font-family:'Montserrat',sans-serif;";

    modal.innerHTML =
      '<button id="bpr-modal-close" type="button" aria-label="Close" style="position:absolute;top:0.8rem;right:1rem;background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--text-muted);">&times;</button>' +
      '<p style="font-size:0.6rem;letter-spacing:0.25em;text-transform:uppercase;color:var(--gold);margin-bottom:0.6rem;">Confirm Your Booking</p>' +
      '<h3 style="font-weight:300;font-size:1.3rem;color:var(--dark);margin-bottom:0.3rem;">' + details.roomTypeName + "</h3>" +
      '<p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:1.4rem;">' +
      details.checkIn + " \u2192 " + details.checkOut + " \u2022 KES " + details.totalKes.toLocaleString() + " total</p>" +
      '<div style="display:flex;gap:0.7rem;margin-bottom:0.9rem;">' +
      '<input id="bm-first-name" placeholder="First name" style="flex:1;padding:0.65rem;border:1px solid #ddd;font-family:inherit;font-size:0.82rem;"/>' +
      '<input id="bm-last-name" placeholder="Last name" style="flex:1;padding:0.65rem;border:1px solid #ddd;font-family:inherit;font-size:0.82rem;"/>' +
      "</div>" +
      '<input id="bm-email" type="email" placeholder="Email address" style="width:100%;padding:0.65rem;border:1px solid #ddd;font-family:inherit;font-size:0.82rem;margin-bottom:0.9rem;"/>' +
      '<input id="bm-phone" type="tel" placeholder="Phone (e.g. 2547XXXXXXXX)" style="width:100%;padding:0.65rem;border:1px solid #ddd;font-family:inherit;font-size:0.82rem;margin-bottom:1.2rem;"/>' +
      '<button id="bm-submit" type="button" class="btn-primary" style="width:100%;text-align:center;cursor:pointer;">Continue to Payment</button>' +
      '<p id="bm-error" style="color:#b33;font-size:0.75rem;margin-top:0.7rem;"></p>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById("bpr-modal-close").addEventListener("click", function () {
      overlay.remove();
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.remove();
    });

    document.getElementById("bm-submit").addEventListener("click", function () {
      var submitBtn = document.getElementById("bm-submit");
      var errorEl = document.getElementById("bm-error");
      var payload = {
        roomTypeId: details.roomTypeId,
        checkIn: details.checkIn,
        checkOut: details.checkOut,
        guests: Number(details.guests) || 1,
        firstName: document.getElementById("bm-first-name").value.trim(),
        lastName: document.getElementById("bm-last-name").value.trim(),
        email: document.getElementById("bm-email").value.trim(),
        phone: document.getElementById("bm-phone").value.trim(),
      };

      if (!payload.firstName || !payload.lastName || !payload.email || !payload.phone) {
        errorEl.textContent = "Please fill in all fields.";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Please wait…";
      errorEl.textContent = "";

      fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.ok && result.data.redirectUrl) {
            window.location.href = result.data.redirectUrl;
          } else {
            errorEl.textContent = result.data.error || "Something went wrong. Please try again.";
            submitBtn.disabled = false;
            submitBtn.textContent = "Continue to Payment";
          }
        })
        .catch(function () {
          errorEl.textContent = "Network error — please try again.";
          submitBtn.disabled = false;
          submitBtn.textContent = "Continue to Payment";
        });
    });
  }

  function wireContactForm() {
    var btn = document.getElementById("contactSubmitBtn");
    var resultEl = document.getElementById("contactResult");
    if (!btn || !resultEl) return;

    btn.addEventListener("click", function () {
      var payload = {
        firstName: document.getElementById("cf-first-name").value.trim(),
        lastName: document.getElementById("cf-last-name").value.trim(),
        email: document.getElementById("cf-email").value.trim(),
        enquiryType: document.getElementById("cf-enquiry-type").value,
        message: document.getElementById("cf-message").value.trim(),
      };

      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email);
      if (!payload.firstName || !payload.lastName || !emailOk || !payload.message) {
        resultEl.style.color = "#b33";
        resultEl.textContent = "Please fill in your name, a valid email, and a message.";
        return;
      }

      btn.disabled = true;
      btn.textContent = "Sending…";
      resultEl.textContent = "";

      fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.ok) {
            resultEl.style.color = "var(--gold)";
            resultEl.textContent = "Thank you — we'll be in touch within 24 hours.";
            ["cf-first-name", "cf-last-name", "cf-email", "cf-message"].forEach(function (id) {
              document.getElementById(id).value = "";
            });
          } else {
            resultEl.style.color = "#b33";
            resultEl.textContent = result.data.error || "Something went wrong. Please try again.";
          }
        })
        .catch(function () {
          resultEl.style.color = "#b33";
          resultEl.textContent = "Network error — please try again.";
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "Send Message";
        });
    });
  }
})();
