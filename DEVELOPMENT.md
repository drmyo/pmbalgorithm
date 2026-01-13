# Country Resolution Algorithm - PubMedBridge

## In the face of ambiguity, refuse the temptation to guess

Peters, T. (2004). PEP 20: The Zen of Python. Python Software Foundation. https://peps.python.org/pep-0020/

## Development Notes

This document describes internal development principles, architecture,
and implementation details intended for maintainers and contributors.

It is **not** a required reading for users of the software.
Users should refer to [`README.md`](./README.md).
Those interested in algorithm validation should consult [`VALIDATION.md`](./VALIDATION.md).

## Project Goals

- Provide an accessible and reproducible preprocessing pipeline.
- Prioritize methodological clarity over aggressive heuristics.
- Favor conservative resolution to minimize false positives.

## Non-Goals

- Perfect resolution of all cases.
- Replacement of human validation, existing script-based or machine learning approaches.

## Design Philosophy: In the face of ambiguity, refuse the temptation to guess

This project follows a conservative, rule-based approach.
Ambiguous cases are intentionally left unresolved and flagged rather than forced.

Key principles:

- Explicit rules
- Traceable decision paths
- Fail-safe behavior (prefer false negatives over false positives)

---

## Architecture Overview

The system consists of the following logical stages:

1. Text standardization and cleanup
2. Pattern-based inference
3. Dictionary lookup
4. Heuristic resolution with safeguards
5. Fallback and manual review flagging

Each stage is independent and produces interpretable intermediate outputs.

---

## Country Resolution Algorithm [`resolveCountry.js`](./countryResolver.js): Notable Notes

### import {....} from './config.js'

- [`config.js`](./config.js) is designed as a separate module for easy reference and maintenance.
- It contains configuration constants including regex patterns, geographic data, institutional identifiers, and special case mappings used throughout the affiliation parsing system.

### standardizeAffiliationText()

- removes diacritical marks, standardizing country abbreviations (U.S.A -> USA, U.K -> UK), normalizing quotes, and collapsing whitespace.

### stripNonAffiliationContent()

- removing emails, phone numbers, postcodes, identifiers, and other non-geographic information.

  - Future Plan: To add ORCID, ROR, ISNI, GRID, and RINGGOLD identifiers when adoption increases.

- #### Removing "_and_"

  - There are strings with more than one affiliation connected by a semicolon and _and_ resulting _and_ as a separate string. E.g., `PMID - 38820262 Division of Respiratory Medicine, University of British Columbia, Vancouver, British Columbia, Canada; and.`
    - The algorithm filtered these `and` as non-affiliation strings unless it is between 2 words.
    - Reason: Simply removing _and_ leads to e.g., Trinidad and Tobago → TRINIDAD TOBAGO (UNRESOLVED), Bosnia and Herzegovina BOSNIA HERZEGOVINA (UNRESOLVED).

- #### .replace(REGEX_PATTERNS.PARENTHESES_END, ''): removes all the content within parentheses including country names, which may be undesirable.
  - There are cases where country names are within parentheses.
  - Future Plan: To check the prevalence of such cases in PubMed affiliations.

### Step 1. checkDirectMatch()

- Checks if the last segment contains an exact match to a country name or its aliases from the [`country list`](./countryList.json).

### Step 2. checkAlpha3Code()

- Matches alpha-3 code that is ALL CAPS and a standalone word with the alpha3 codes fom from the [`country list`](./countryList.json).
- If not ALL CAPS and standalone, e.g., _Department of Cardiovascular and Thoracic Surgery, Franciscan St Francis Health, Indianapolis, Ind._ → IND (UNRESOLVED).

#### findCountryAtEnd()

- Used in **Step 1. checkDirectMatch()** and **Step 2. checkAlpha3Code()**.
- Though PubMed affiliation strings are unstandardized, we assume department, institution, city, country (after text standardization and cleanup).
  - [address component], [address component], ..., [country] format is over 80% of them adhere to (Yu, et al. (2007). An automatic method to generate domain-specific investigator networks using PubMed abstracts, BMC Medical Informatics and Decision Making, 7).
- Applies to **checkDirectMatch()** and **checkAlpha3Code**.

#### Special Case Handlers

- These handlers address a small number of systematic edge cases and may require incremental refinement as additional patterns are identified.
- In principle, a generalizable algorithmic solution is preferable to explicit rule-based overrides; however, for certain cases, the cost–benefit trade-off does not justify added algorithmic complexity.
- The country string _Korea, Republic of_ cannot be resolved to _Republic of Korea_ under the current design because the algorithm evaluates only a single segment when resolving country names.
  - Notably, _Korea, Republic of_ and _Korea, Democratic Republic of_ are the only country names that contain an internal comma.
  - A PubMed search using `"Korea, Republic of"[Affiliation]` returns only 8 records, indicating that this pattern is extremely rare.
  - Introducing additional logic—such as multi-segment country matching analogous to the institution-matching strategy—would increase algorithmic complexity with negligible impact on overall accuracy.
  - Therefore, this limitation is explicitly accepted as a design decision, and neither a specialized override nor an expanded matching algorithm is implemented for this case.

### Step 3. inferUSFromStateName()

- The reference is in [`config.js`](./config.js) US_STATE.
- The function tests the last segment in 2 passes since US State are 2 or 1 word names.
- Patterns that indicate institutional names, not locations (e.g., _University of Washington_) are excluded from matching in this stage and returns _null_.

### Step 4. inferUSFromStateAbbreviation()

- Considers ALL CAPS AND (if preceded by comma OR last word of segment).
- The reference is in [`config.js`](./config.js) US_STATE_ABBREVIATIONS (two-letter postal codes). Non-postal abbreviations (e.g., Calif., Tex., Ill, etc.) are not matched.
- Skips _CO_ if followed by _LTD_ or _LIMITED_ to prevent assigning Colorado.

### Step 5. inferCountryFromInstitution()

- Resolves country by matching institution names against the [`reference institution dataset`](./institutionList.json) using a 3-pass exact match approach:
  - 1. Individual pieces starting from the last segment
  - 2. Combined last N comma-separated segments (N = 2, 1) or second-last segment
  - 3. Full affiliation (commas preserved)
- Pass 2 will catch _University of California, Berkeley_ but not _University of California Berkeley_
- We need community contribution for normalization of the strings and the maps.

#### disambiguateInstitutionMatches()

- If the **inferCountryFromInstitution** matches more than one country, disambiguates by checking city context.
- Used in **inferCountryFromInstitution**.

#### forcedInferCountryFromCity()

- Used as Step 5.5.
- Similar to inferCountryFromCity but used specifically when institution names don't match city names, providing an additional verification layer.
- There are cases where the only institution name in the reference institution dataset indicates a country and the city name in the affiliation indicates another country. If this step were not included, the country would be resolved to the institution country.
- We assume the city name is a stronger indicator than the institution name in this case.
- In fact, we encounted only one string during our development process.

#### forcedHandleCityMatches()

- Processes city matches for the forced city check: returns country only if the city uniquely belongs to one country, otherwise returns null.
- Used in **forcedInferCountryFromCity()**.

### Step 6. inferCountryFromCity()

- Attempts to resolve country by matching 1-4 word city names at the last or second last segment against the city names in [`reference institution dataset.json`](./institutionList.json).

#### handleCityMatches()

- Processes city matches from [`reference institution dataset`](./institutionList.json).
- Returns clear country if city is unique to one country, or flags confusion if city exists in multiple countries
- Used in **Step 6. inferCountryFromCity()**.

### standardizeCountryName()

- Standardizes a country name to its canonical form using [`country list`](./countryList.json).
- E.g., _South Korea_ → _Republic of Korea_.

---

## Reference Institution Dataset

Institution-based and city-based resolution relies on a unified reference institution dataset compiled from:

- **Research Organization Registry (ROR)**
- **OpenAlex**

See [`ATTRIBUTION.md`](./ATTRIBUTION.md)

---

### Dataset Construction

- **ROR v1.74** (downloaded 1 Dec 2025): Mininized using [`ror_minimizer.html`](./HelperTools/ror_minimizer.html) to essential fields (institution name, aliases, city, country), yielding **120,196 institutions**

- **OpenAlex** (downloaded 1 Dec 2025): Extracted and standardized using [`oa_downloader.html`](./HelperTools/oa_downloader.html) to the same schema, yielding **115,781 institutions** (8,072 without country data)

The two datasets were merged by institution name and matching country using [`dataset_merger.html`](./HelperTools/dataset_merger.html).
Aliases were combined, duplicates removed, and records with non-null country data were prioritized.

The final unified [`reference institution dataset`](./institutionList.json) contains **120,428 institutions**.

_NOTE_: Subsequent to tool validation, an updated **ROR v2.0** became available on 16 December 2025, increasing the number of registered organizations from 120,196 to 120,445. As this update represents a modest expansion of the registry, the validation results reported here are unaffected. For reproducibility, all analyses presented in this study are based on the ROR dataset version used at the time of validation (v1.74).

---

## Input Data Assumptions

- Input data originates from PubMed affiliation strings.

---

## Known Limitation

- Institution or city-only affiliation strings with no matching institution or city name in the institution dataset will not be resolved.

---

## Resolution Philosophy and Scope

- This project deliberately prioritizes auditability, reproducibility, and methodological restraint over maximal recall. An unresolved affiliation is preferred to an incorrectly resolved one, as false positives can silently bias downstream analyses.

- Accordingly, the presence of **_UNRESOLVED_** outcomes should be interpreted as an explicit signal of ambiguity rather than a failure of the algorithm. These cases are intentionally preserved for targeted manual validation.

- While the algorithm may be incrementally refined as new systematic patterns are identified, it is not intended to evolve into a fully automated or probabilistic resolver.

- Contributions are welcome, particularly those that improve normalization, expand reference institution dataset, or enhance auditability—provided they align with the project’s core philosophy: when in doubt, do not guess - let ambiguity be known.
