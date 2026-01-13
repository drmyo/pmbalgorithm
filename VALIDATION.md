# Validation Study: PubMedBridge Country Resolution Algorithm

## Overview

This document provides detailed documentation of the validation methodology, sampling strategy, and performance evaluation of the PubMedBridge country resolution algorithm.

---

## 1. Dataset Construction

### 1.1 Source Query

**PubMed Query:**

```
"multicenter study"[Publication Type]
```

**Rationale:** These queries targeted any multicenter study published, while excluding editorials and letters, to collect affiliation strings for country extraction.

**Query Execution Date:** 10/12/2025

**Initial Results:**

- 385,825 results

### 1.2 Dataset Preparation

- The Best Matched 10,000 records were downloaded (PubMed default download limit per query).
- The records were parsed using PubMed2XLSX and exported in spreadsheet format.
- The spreadsheet was analysed in Microsoft Excel.

**Exclusion Criteria**

- **Articles with no affiliation string:** 69

**Dataset:**

- **Total articles:** 9,931 articles
- **Total affiliation strings:** 108,557 unique strings
- **Mean affiliations per article:** 10.93
- **Minimum affiliation(s) per article:** 1
- **Maximum affiliation(s) per article:** 120
- **Standard Deviation:** 8.55
- **Skewness:** 2.50
- **Kurtosis:** 12.12

---

## 2. Sampling Strategy

### 2.1 Stratified Random Sampling

**Total sample size:** 430 (unique for each record) affiliation strings (0.4% of total)

**Sampling method:** Stratified random sampling with inverse proportional allocation (intentional oversampling of edge cases)

**Implementation:**

1. Each record was assigned a random number using Excel’s =RAND() function, multiplied by 10 to improve distribution.
2. To prevent random number regeneration during sorting, values were copied and pasted as static numbers.
3. Records were sorted from smallest to largest based on the assigned random number.
4. Only the first output per record was selected when the stratum sample size was exceeded, preventing overrepresentation of any single record.
5. Samples were then selected proportionally from each resolution method category (see Table 1).

**Oversampling rationale:** Edge cases and ambiguous assignments—including InstitutionNameConfusion, InstitutionCityConfusion, and UNRESOLVED—were intentionally oversampled to ensure sufficient data for reliable error estimation in these critical groups.

### Table 1 Total Count and Sample Distribution by Resolution Method

| Resolution Method            | Total Count | Percent | Sample Size | Sample Rate (%) | Sample % |
| ---------------------------- | ----------: | ------: | ----------: | --------------: | -------: |
| **_High-Confidence_**        |             |         |             |                 |          |
| DirectMatch                  |      86,352 |   79.55 |          45 |            0.05 |    10.47 |
| alpha3                       |      10,819 |    9.97 |          11 |             0.1 |     2.56 |
| USStateName                  |       3,812 |    3.51 |          20 |             0.5 |     4.65 |
| USStateAbbr                  |       3,455 |    3.18 |          18 |             0.5 |     4.19 |
| **_Low-Confidence_**         |             |         |             |                 |          |
| InstitutionName              |       1,919 |    1.77 |          94 |               5 |    22.33 |
| InstitutionCity              |         883 |    0.79 |          43 |               5 |    10.47 |
| **_No-Confidence_**          |             |         |             |                 |          |
| USGeorgiaToCheck             |           0 |       0 |           0 |               0 |        0 |
| InstitutionNameConfusion     |          23 |   0.021 |          23 |             100 |     5.35 |
| InstitutionCityConfusion     |         215 |   0.199 |          52 |              25 |    12.56 |
| UNRESOLVED                   |         925 |   0.852 |          92 |              10 |    21.63 |
| **_Non-Affiliation String_** |             |         |             |                 |          |
| ContributionNote             |          10 |   0.009 |           7 |             100 |     2.34 |
| FilteredString               |         144 |   0.133 |          15 |              10 |     3.49 |
| **Total**                    | **108,557** | **100** |     **430** |         **0.4** |  **100** |

---

## 3. Manual Validation Protocol

### 3.1 Verification Methodology

**Validator(s):** Both authors (Nilar Khin and Myo Kyi Tha)

**Validation sources:**

1. Original affiliation strings in PubMed (txt) file (accessed via PubMed Identifier (PMID))
2. For edge cases, institutional websites, and web search for institution names and locations.

**Validation criteria:**

- Each sampled affiliation string was manually reviewed to determine the **ground truth country** assignment. The algorithm's output was then compared against this benchmark.

**Manual Verification**

- Each sampled affiliation string was manually verified by both authors through a tiered process. The verification steps depended on the confidence level and type of the original resolution.

1. High-Confidence Resolutions: For records in which the system assigned a country with high confidence (e.g., DirectMatch, alpha3), verification consisted of confirming that the resolved country matched the country explicitly stated in the original affiliation string as recorded in the downloaded PubMed (.txt) file.
2. Low-Confidence, No-Confidence, and Problematic Cases: For low- and no-confidence cases, both authors jointly reviewed the original affiliation strings and, where necessary, institutional websites to reach a consensus country assignment.

This approach emphasizes edge cases, which are the primary source of potential errors. Joint verification ensured consistent and accurate ground-truth determination for these challenging records. The tiered, risk-based strategy aligns with calls in scientometrics for context-sensitive and methodologically rigorous validation of bibliometric data (Mingers & Leydesdorff, 2015; Waltman & van Eck, 2013).

Mingers, J., & Leydesdorff, L. (2015). A review of theory and practice in scientometrics. In European Journal of Operational Research (Vol. 246, Issue 1, pp. 1–19). Elsevier B.V. https://doi.org/10.1016/j.ejor.2015.04.002

Waltman, L., & van Eck, N. J. (2013). A systematic empirical comparison of different approaches for normalizing citation impact indicators. Journal of Informetrics, 7(4), 833–849. https://doi.org/10.1016/j.joi.2013.08.002

### 3.2 Consensus-based adjudication

Consensus-based adjudication was done to prioritize the accuracy of the gold-standard labels for ambiguous records over estimation of inter-rater reliability.

This method reflects common practice in annotation and data-cleaning workflows when resources are focused on the most error-prone cases (Hoang, 2025).

Hoang, A. D. (2025). Evaluating Bibliometrics Reviews: A Practical Guide for Peer Review and Critical Reading. In Evaluation Review (Vol. 49, Issue 6, pp. 1074–1102). SAGE Publications Inc. https://doi.org/10.1177/0193841X251336839

---

## 4. Performance Metrics

### 4.1 Definitions

In line with standard classification theory (Fawcett, 2006; Powers, 2011)

- **True Positive (TP):** Algorithm assigns the correct country
- **False Positive (FP):** Algorithm assigns a country incorrectly relative to ground truth
- **True Negative (TN):** Algorithm correctly abstains due to insufficient evidence
- **False Negative (FN):** Algorithm fails to assign a country despite sufficient resolvable information

Fawcett, T. (2006). An introduction to ROC analysis. Pattern Recognition Letters, 27(8), 861–874. https://doi.org/10.1016/j.patrec.2005.10.010

Powers, D. M. W. (2011). Evaluation: From precision, recall and F-measure to ROC, informedness, markedness and correlation. 2(1), 37–63. https://doi.org/10.48550/arXiv.2010.16061

### 4.2 Confusion Matrix

|                               | Algorithm: Country Assigned | Algorithm: Flagged/Unresolved |
| ----------------------------- | --------------------------- | ----------------------------- |
| **Ground Truth: Has Country** | TP = 234                    | FN = 119                      |
| **Ground Truth: Ambiguous**   | FP = 1                      | TN = 76                       |

### 4.3 Key Performance Indicators

| Metric                                    | Formula                                         | Value         |
| ----------------------------------------- | ----------------------------------------------- | ------------- |
| **Precision** (Positive Predictive Value) | TP / (TP + FP)                                  | 0.996 (99.6%) |
| **Recall** (Sensitivity)                  | TP / (TP + FN)                                  | 0.663 (66.3%) |
| **Accuracy**                              | (TP + TN) / Total                               | 0.721 (72.1%) |
| **Specificity**                           | TN / (TN + FP)                                  | 0.987 (98.7%) |
| **F1-Score**                              | 2 × (Precision × Recall) / (Precision + Recall) | 0.780         |
| **Negative Predictive Value**             | TN / (TN + FN)                                  | 0.390 (39%)   |

### 4.4 Interpretation

**99.6% Precision:** Almost all country assignments were correct. This shows the algorithm is highly reliable when it makes a prediction.

**98.7% Specificity:** The algorithm was able to correctly identify truly ambiguous cases in almost all instances.

**66.4% Recall:** The algorithm successfully resolved about 66% of affiliations with determinable countries. The remaining 34% were flagged for manual review, reflecting its conservative design to minimize incorrect country assignments.

**F1-Score of 0.780:** This score reflects the balance between high precision and specificity with lower recall, capturing the conservative nature of the algorithm.

**Negative Predictive Value of 0.390:** When the algorithm flags a case as ambiguous, it is correct roughly one-third of the time. While this is low, it reflects the system’s cautious approach—better to defer uncertain cases for manual review than risk errors.

### 4.5 Detailed Breakdown

| Resolution Method        | Sample Size |  TP |  FP |  TN |  FN |
| ------------------------ | ----------: | --: | --: | --: | --: |
| DirectMatch              |          45 |  45 |   0 |   0 |   0 |
| alpha3                   |          11 |  11 |   0 |   0 |   0 |
| USStateName              |          20 |  20 |   0 |   0 |   0 |
| USStateAbbr              |          18 |  18 |   0 |   0 |   0 |
| InstitutionName          |          96 |  95 |   1 |   0 |   0 |
| InstitutionCity          |          45 |  45 |   0 |   0 |   0 |
| USGeorgiaToCheck         |           0 |   0 |   0 |   0 |   0 |
| InstitutionNameConfusion |          23 |   0 |   0 |  10 |  13 |
| InstitutionCityConfusion |          54 |   0 |   0 |   9 |  45 |
| UNRESOLVED               |          93 |   0 |   0 |  32 |  61 |
| ContributionNote         |          10 |   0 |   0 |  10 |   0 |
| FilteredString           |          15 |   0 |   0 |  15 |   0 |
| **TOTAL**                |         430 | 234 |   1 |  76 | 119 |

### 4.6 Key Findings

1. High-confidence tiers (1–4) maintained perfect precision — every assignment they made was correct.
2. Low-confidence tiers (5–6) 99.3% precision, demonstrating high reliability even in less certain cases.
3. No-confidence outputs have a negative predictive value of 0.30, reflecting that most flagged cases are unresolved rather than incorrectly assigned.
4. Flagged categories functioned as intended, effectively identifying ambiguous affiliations instead of producing potentially incorrect assignments.

---

## 5. Analysis of False Negatives

### 5.1 Nature of False Negatives

**Critical finding:** The 119 false negatives represent the algorithm's **conservative resolution strategy** where:

1. The algorithm correctly identified ambiguity in the affiliation string (e.g., cities appearing in multiple countries in the ROR dataset).
2. Rather than risk an incorrect assignment, it applied a diagnostic flag (InstitutionNameConfusion, InstitutionCityConfusion, UNRESOLVED) to indicate uncertainty.
3. These cases can be resolved by human curators using additional contextual information, such as institutional names, national health systems, email domains, state/province identifiers, or language cues.
4. These cases also reflect incomplete coverage of external institution datasets (ROR and OpenAlex).

---

## 6. Validation of High-Confidence Outputs

1. Radnomization applied to each high-confidence output category (_DirectMatch, alpha3, USStateName, USStateAbbr_) as in the validation study above.
2. The first outputs of 100 records of each category was selected for manual verification.
3. Manual verification was done as in the validation study above.

### 6.1 Manual verification confirmed a 100% true positive rate: all high-confidence country assignments were accurate based on the information in the affiliation strings.

---

## 7. Limitations and Boundaries

1. **Institution List Coverage:** The algorithm’s performance on Tiers 5–6 depends on institutional and city coverage derived from the ROR v1.74 and OpenAlex datasets. Institutions not present in these reference institution dataset are returned as UNRESOLVED. The algorithm relies on exact string matching rather than fuzzy matching to avoid false positives. Minor spelling variations, language differences, or uncommon transliterations will not match.

2. **Exact Institutional Name Matching:** Partial or generic forms of institution names that do not appear in the reference institution dataset will not be resolved. This ensures high precision but may result in UNRESOLVED outcomes for broadly referenced or imprecisely formatted affiliations.

3. **Delimiter-Dependent Parsing:** City names must be delimited by commas or semicolons to be recognized as separate geographic tokens. Cities embedded within institution names (e.g., "University of Madrid" which is not in the Institution List) will not trigger Step 6 (InstitutionCity) resolution:

```
University of Madrid → UNIVERSITY OF MADRID (UNRESOLVED)
University of Madrid, Madrid → Spain (Madrid - InstitutionCity)
```

4. **Heuristic Special Cases Are Incomplete by Design:** The algorithm includes explicit heuristic handling for a limited set of known geographic ambiguities, including: (e.g., _Georgia (Country)_ vs. _Georgia (US State)_, _Mexico (Country)_ vs. _New Mexico (US State)_, _Republic of Korea_ vs. _Democratic Republic of Korea_, etc.).

Implication: The special-case logic improves precision for known ambiguities but is intentionally conservative. It prioritizes avoiding false positives over exhaustive disambiguation, resulting in some affiliations remaining ambiguous.

5. **Context-Dependent Heuristics:** The algorithm cannot leverage all contextual clues a human might use (e.g., “NHS Trust” WILL NOT → United Kingdom).

6. **End-of-String Parenthetical Handling:** The preprocessing step removes parenthesized content occurring at the end of an affiliation string. While this simplifies downstream parsing, it may also remove informative country names expressed solely in trailing parentheses (e.g., “Department of X (France)”), leading to conservative UNRESOLVED outcomes. Conditional or context-aware handling of trailing parentheses could improve recall without increasing false positives.

---

## 8. Multi-language Support

The resolver supports multiple languages and scripts (e.g., Latin with accents, Chinese, Japanese, Korean, Thai, Arabic, Hebrew) as long as the institution or alias is included in the reference institution dataset.

```
广西壮族自治区人民医院 → China (The People's Hospital of Guangxi Zhuang Autonomous Region - InstitutionName)
明治国際医療大学 → Japan (Meiji University of Integrative Medicine - InstitutionName)
차세대융합기술연구원 → Republic of Korea (Advanced Institute of Convergence Technology - InstitutionName)
המכון הגיאופיסי לישראל → Israel (Geophysical Institute of Israel - InstitutionName)
Университет Российской Академии Образования → Russian Federation (University of the Russian Academy of Education - InstitutionName)
Τεχνολογικό Εκπαιδευτικό Ίδρυμα Στερεάς Ελλάδας → Greece (Technological Educational Institute of Central Greece - InstitutionName)
มหาวิทยาลัยเวบสเตอร์ → Thailand (Webster University Thailand - InstitutionName)
नेपाल संस्कृत विश्वविद्यालय → Nepal (Nepal Sanskrit University - InstitutionName)
தமிழ்நாடு திறந்தநிலைப் பல்கலைக்கழகம் → India (Tamil Nadu Open University - InstitutionName)
ইউনিভার্সিটি অফ সাউথ এশিয়া → Bangladesh (University of South Asia - InstitutionName)
Հայաստանի ազգային ագրարային համալսարան → Armenia (Armenian National Agrarian University - InstitutionName)
دانشگاه خلیج فارس → Iran (Persian Gulf University - InstitutionName)
جامعة محمد الأول → Morocco (Mohamed I University - InstitutionName)
```

_NOTE_: The validation dataset contained no non-Latin-alphabet affiliation strings.

## 9. Data Availability

**9.1 Complete dataset (10,000 records)**: [`validationAffiliations.xlsx`](./Data/validationPMIDs.xlsx):

- PMIDs

**9.2. Validation population (9,931 records)**: [`validationPopulation.xlsx`](./Data/validationPopulation.xlsx)
Excluding records with no affiliation strings

- PMIDs
- Generated random numbers
- Deduplicated author strings, including both affiliation and non-affiliation strings
- Deduplicated countries of all authors for resolved affiliation strings
- Deduplicated strings, resolved countries and resolution methods of all authors
- Resolution methods applied to all strings, with counts of resolved and unresolved strings for each method
- Total number of strings resolved and total unresolved strings

**9.3. Performance Analysis (9518 records)**: [`performanceAnalysis.xlsx`](./Data/performanceAnalysis.xlsx)
Excluding records with no affiliation strings and records with one or more UNRESOLVED strings

- PMIDs
- Deduplicated countries of all authors

---
