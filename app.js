// app.js designed for user interface for Country Resolution Algorithm Demo.
// It is not included in PubMedBridge package

// Import necessary functions and constants
import { resolveCountry, standardizeAffiliationText } from "./countryResolver.js";
import { LIMIT } from "./config.js";

// Helper function to fetch JSON files (countryList.json and institutionList.json)
async function fetchJson(url, errorMsg) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(errorMsg);
  return await res.json();
}

// Builds institution lookup map with normalized keys
// Includes original institution data
// Normalized keys are to match with normalized user input affiliation strings
// Original institution data is for output display
function buildInstitutionLookup(rawInstitutionList) {
  const institutionLookup = new Map();
  for (const inst of rawInstitutionList) {
    // Create BOTH original and normalized variants
    const variants = [inst.name, ...(inst.aliases || [])];

    for (const variant of variants) {
      // Store with NORMALIZED key, but preserve ORIGINAL institution data
      const normalizedKey = standardizeAffiliationText(variant).toLowerCase().trim();

      if (!institutionLookup.has(normalizedKey)) {
        institutionLookup.set(normalizedKey, []);
      }

      // Store original institution object (not normalized)
      institutionLookup.get(normalizedKey).push(inst);
    }
  }
  return institutionLookup;
}

// Builds city to country map with normalized keys
function buildCityToCountryMap(rawInstitutionList) {
  const cityToCountryMap = new Map();
  for (const inst of rawInstitutionList) {
    if (inst.city && inst.country) {
      // Store with NORMALIZED city key
      const normalizedCityKey = standardizeAffiliationText(inst.city)
        .toLowerCase()
        .trim();

      if (!cityToCountryMap.has(normalizedCityKey)) {
        cityToCountryMap.set(normalizedCityKey, []);
      }

      cityToCountryMap.get(normalizedCityKey).push({
        country: inst.country, // Original country name
        institutionName: inst.name, // Original institution name
      });
    }
  }
  return cityToCountryMap;
}

async function loadData() {
  const resolveBtn = document.getElementById("resolveBtn");
  const affilInput = document.getElementById("affilInput");
  const resultsSection = document.getElementById("results-section");
  const resultsElement = document.getElementById("results");

  // Add loading state to button
  const originalButtonText = resolveBtn.textContent;

  try {
    // Show loading state
    resolveBtn.disabled = true;
    resolveBtn.textContent = "Loading data...";

    // Show initial status in results
    resultsElement.textContent = "Loading country list and Institution dataset...";
    resultsSection.classList.add("visible");

    // Load data using the helper function
    const errors = [];
    let countryList, institutionList;

    try {
      countryList = await fetchJson(
        "./countryList.json",
        "Failed to load country list (countryList.json)."
      );
    } catch (err) {
      errors.push(err.message);
    }

    try {
      institutionList = await fetchJson(
        "./institutionList.json",
        "Failed to load institutions (institutionList.json)."
      );
    } catch (err) {
      errors.push(err.message);
    }

    if (errors.length > 0) {
      throw new Error(errors.join("\n"));
    }

    // Validate loaded data
    if (!Array.isArray(countryList)) {
      throw new Error("countryList.json is not a valid array");
    }

    if (!Array.isArray(institutionList)) {
      throw new Error("institutionList.json is not a valid array");
    }

    // Show success status
    resultsElement.textContent = `Data loaded successfully! (${countryList.length} countries and ${institutionList.length} institutions.)`;

    // Build institution and city maps using the new functions
    const institutionLookup = buildInstitutionLookup(institutionList);
    const cityToCountryMap = buildCityToCountryMap(institutionList);

    // Add input event listener to enable/disable button
    affilInput.addEventListener("input", () => {
      const hasText = affilInput.value.trim().length > 0;
      resolveBtn.disabled = !hasText;
      if (!hasText) {
        resultsSection.classList.remove("visible");
      }
    });

    // Clear loading state and enable button if there's text
    resolveBtn.textContent = originalButtonText;
    resolveBtn.disabled = affilInput.value.trim().length === 0;

    resolveBtn.addEventListener("click", () => {
      try {
        const input = affilInput.value.trim();
        if (!input) {
          resultsElement.textContent = "Please enter affiliation text.";
          return;
        }

        const lines = input.split("\n").filter((line) => line.length > 0);

        const results = [];
        const countriesSet = new Set();

        lines.forEach((affil, index) => {
          const res = resolveCountry(
            affil,
            countryList,
            institutionLookup,
            cityToCountryMap,
            LIMIT
          );

          // Handle multiple country entries from semicolon-separated affiliations
          if (res && res.length > 0) {
            // Display all resolved countries for this affiliation
            const countryEntries = res
              .map((entry) => `${entry.country} (${entry.source})`)
              .join(", ");

            results.push(`${affil} → ${countryEntries}`);

            // Add to countries set if resolved
            res.forEach((entry) => {
              const originalSource = entry.source || "UNRESOLVED";

              if (entry.country && entry.country.trim() !== "") {
                const excludedSources = new Set([
                  "UNRESOLVED",
                  "InstitutionNameConfusion",
                  "InstitutionCityConfusion",
                  "USGeorgiaToCheck",
                  "ContributionNote",
                  "FilteredStrings",
                ]);

                if (!excludedSources.has(originalSource)) {
                  countriesSet.add(entry.country);
                }
              }
            });
          } else {
            // No resolution at all
            results.push(`${affil} → UNRESOLVED`);
          }
        });

        const countryLines = ["\n=== COUNTRIES ==="];
        const Countries = [...countriesSet];

        if (Countries.length > 0) {
          Countries.forEach((c) => countryLines.push(`• ${c}`));
        } else {
          countryLines.push("No countries resolved");
        }

        // Combine all sections
        const output = [
          `=== PROCESSED ${lines.length} AFFILIATION(S) ===`,
          ...results,
          ...countryLines,
        ].join("\n");

        resultsElement.textContent = output;

        // Show the results section
        resultsSection.classList.add("visible");

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (error) {
        resultsElement.textContent = `Error processing affiliations: ${error.message}`;
        resultsSection.classList.add("visible");
      }
    });

    // Add Enter key support (Ctrl+Enter or Cmd+Enter)
    affilInput.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (!resolveBtn.disabled) {
          resolveBtn.click();
        }
      }
    });

    // Add clear button functionality
    const clearButton = document.createElement("button");
    clearButton.textContent = "Clear";
    clearButton.id = "clearBtn";
    clearButton.style.marginLeft = "10px";
    clearButton.addEventListener("click", () => {
      affilInput.value = "";
      resolveBtn.disabled = true;
      resultsSection.classList.remove("visible");
      affilInput.focus();
    });

    resolveBtn.insertAdjacentElement("afterend", clearButton);
  } catch (error) {

    // Show error to user
    resultsElement.textContent = `Error loading application: ${error.message}\n\nPlease ensure:\n1. countryList.json exists\n2. institutionList.json exists\n3. Both files are in the correct location\n4. Server allows JSON file access`;
    resultsSection.classList.add("visible");

    // Disable resolve button permanently
    resolveBtn.disabled = true;
    resolveBtn.textContent = "Initialization Failed";
    resolveBtn.style.backgroundColor = "#dc3545";
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadData);
} else {
  loadData();
}

// Export for testing if needed
export { loadData };