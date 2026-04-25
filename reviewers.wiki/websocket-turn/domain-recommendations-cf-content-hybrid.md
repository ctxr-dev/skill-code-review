---
id: domain-recommendations-cf-content-hybrid
type: primary
depth_role: leaf
focus: Detect cold-start gaps, popularity bias, recommendation loops, sparse matrix mishandling, and missing evaluation in recommendation systems
parents:
  - index.md
covers:
  - Recommendations without cold-start strategy for new users or items
  - Collaborative filtering without handling sparse interaction matrices
  - Implicit feedback not weighted by signal strength
  - "Missing A/B test for recommendation quality measurement"
  - Recommendation loop showing same items repeatedly
  - Popularity bias not mitigated
  - Missing diversity and serendipity in recommendations
  - "User preferences inferable from recommendations (privacy leak)"
  - Stale model serving outdated recommendations
  - No fallback when personalized model fails
tags:
  - recommendation
  - collaborative-filtering
  - content-based
  - matrix-factorization
  - ALS
  - embedding
  - cold-start
  - diversity
  - popularity-bias
  - "A/B-test"
  - implicit-feedback
activation:
  file_globs:
    - "**/*recommend*"
    - "**/*collab*"
    - "**/*matrix_factor*"
    - "**/*als*"
    - "**/*similarity*"
    - "**/*user_item*"
    - "**/*cold_start*"
  keyword_matches:
    - recommendation
    - collaborative filtering
    - content-based
    - matrix factorization
    - ALS
    - embedding
    - user-item
    - cold start
    - similarity
    - cosine
    - implicit
    - explicit
    - "A/B test"
    - candidate generation
    - ranking model
    - recall set
    - nearest neighbor
  structural_signals:
    - user_item_matrix
    - recommendation_model_training
    - candidate_generation_pipeline
    - similarity_computation
    - recommendation_serving
source:
  origin: file
  path: domain-recommendations-cf-content-hybrid.md
  hash: "sha256:47d1983046d1bb9ca0c41acd304ad4068e01f0daef45cf025fcb3f83058e972f"
---
# Recommendations: Collaborative Filtering / Content-Based / Hybrid

## When This Activates

Activates on diffs involving recommendation model training, user-item interaction matrices, similarity computation, candidate generation, recommendation serving, or A/B test configuration for recommendations. Recommendation systems fail in subtle ways that erode user trust over time: new users see irrelevant or empty recommendations, popular items crowd out the long tail, feedback loops narrow recommendations to a shrinking set, and stale models serve outdated suggestions. These failures are invisible in offline metrics but directly impact engagement and revenue.

## Audit Surface

- [ ] New user or item with no recommendation path
- [ ] Collaborative filtering on extremely sparse matrix without handling
- [ ] Implicit feedback treated as uniform signal
- [ ] No online A/B test for recommendation quality
- [ ] Same items recommended repeatedly (feedback loop)
- [ ] Popularity bias dominates personalized recommendations
- [ ] No diversity or serendipity constraint
- [ ] Recommendations leak sensitive user preferences
- [ ] Model not retrained on a defined schedule
- [ ] No fallback when personalized model fails
- [ ] Training data includes unavailable items
- [ ] User interaction data retained without consent policy

## Detailed Checks

### Cold-Start Handling
<!-- activation: keywords=["cold start", "new user", "new item", "onboarding", "bootstrap", "fallback", "popular", "trending", "content-based", "metadata", "feature"] -->

- [ ] **No new-user strategy**: flag recommendation pipelines that return empty results or error for users with no interaction history -- new users must receive recommendations via popularity-based, content-based, demographic, or onboarding-survey fallbacks
- [ ] **No new-item strategy**: flag recommendation systems that cannot recommend newly added items until the next model retrain -- new items with no interactions are invisible to collaborative filtering; use content-based features (metadata, description embeddings) to surface them immediately
- [ ] **Cold-start fallback not distinguished**: flag systems that silently serve cold-start fallback (popular items) without tracking it as a distinct recommendation source -- without tracking, there is no way to measure cold-start conversion separately or improve it
- [ ] **Onboarding signals discarded**: flag user onboarding flows that collect preferences (genre selection, liked items) but do not feed them into the recommendation model -- the explicit signal is wasted

### Sparse Matrix and Model Quality
<!-- activation: keywords=["sparse", "matrix", "factorization", "ALS", "SVD", "embedding", "regularize", "train", "fit", "loss", "converge", "epoch"] -->

- [ ] **Unhandled sparsity**: flag collaborative filtering applied to a user-item matrix with >99.5% sparsity without regularization (L2, dropout) or dimensionality reduction -- the model overfits to the few observed interactions and generalizes poorly
- [ ] **Implicit feedback not weighted**: flag models that treat all implicit signals (view, click, purchase, dwell time) as equal positive signals -- a 2-second page view should carry less weight than a purchase; use confidence weighting (e.g., Hu, Koren, Volinsky 2008)
- [ ] **Negative sampling missing**: flag implicit feedback models trained with only positive interactions and no negative sampling strategy -- the model has no signal for what users dislike; use negative sampling or bayesian personalized ranking
- [ ] **Stale model**: flag recommendation serving with no scheduled model retrain -- user preferences shift, new items arrive, and seasonal patterns change; a model trained once becomes stale within days to weeks

### Feedback Loops and Bias
<!-- activation: keywords=["loop", "bias", "popular", "diversity", "serendipity", "explore", "exploit", "bandit", "exposure", "position", "calibration"] -->

- [ ] **Recommendation loop**: flag recommendation systems where displayed items feed back into training data without exposure-bias correction -- items shown more often get more clicks, which makes them recommended even more, narrowing the recommendation set over time
- [ ] **Popularity bias not mitigated**: flag top-N recommendations dominated by globally popular items with no re-ranking for personalization or long-tail exposure -- popular items are recommended regardless of user profile, reducing the value of personalization
- [ ] **No diversity constraint**: flag recommendation lists where all items are from the same category, author, or embedding neighborhood -- users benefit from diversity; apply maximal marginal relevance (MMR) or category-aware re-ranking
- [ ] **Position bias in training data**: flag models trained on click data without correcting for position bias -- items shown in position 1 are clicked more regardless of relevance; use inverse propensity weighting or position-aware models

### Evaluation and A/B Testing
<!-- activation: keywords=["A/B", "test", "experiment", "metric", "nDCG", "MAP", "MRR", "precision", "recall", "conversion", "engagement", "CTR", "offline", "online"] -->

- [ ] **Offline metrics only**: flag recommendation systems evaluated only by offline metrics (nDCG, MRR on held-out data) with no online A/B test -- offline metrics do not capture user satisfaction, diversity preferences, or business impact
- [ ] **No recommendation-specific metrics**: flag A/B tests for recommendations that measure only aggregate engagement (page views, session length) without recommendation-specific metrics (recommendation click-through rate, recommendation-to-conversion rate) -- aggregate metrics are diluted by non-recommendation traffic
- [ ] **Missing baseline comparison**: flag new recommendation models deployed without comparison to the existing model and a simple baseline (popular items, random) -- without a baseline, it is impossible to know if the model adds value
- [ ] **No guardrail metrics**: flag recommendation A/B tests without guardrail metrics (revenue, unsubscribe rate, user complaints) -- a model that improves click-through but increases returns or complaints is not an improvement

### Privacy and Data Handling
<!-- activation: keywords=["privacy", "GDPR", "consent", "PII", "personal", "delete", "retention", "anonymize", "inference", "preference", "sensitive"] -->

- [ ] **Preference inference attack**: flag recommendation APIs that return personalized results to unauthenticated users or users querying another user's profile -- an attacker can infer sensitive preferences (health, political, sexual) from the recommendation list
- [ ] **No data retention policy**: flag user interaction data (clicks, views, purchases) stored indefinitely without a retention policy or GDPR-compliant deletion mechanism -- interaction data is personal data
- [ ] **Training on deleted user data**: flag model training pipelines that do not exclude interactions from users who have requested data deletion -- GDPR right to erasure extends to derived models if the user's data materially influenced them

## Common False Positives

- **Content-based only systems**: systems that recommend based solely on item attributes (content-based filtering) do not have sparse matrix concerns. Do not flag collaborative filtering issues for content-based pipelines.
- **Explicit ratings**: systems using explicit star ratings have denser and more reliable signals than implicit feedback. Do not flag implicit feedback weighting for explicit-rating systems.
- **Curated editorial lists**: manually curated recommendation lists (editor's picks, seasonal collections) are not subject to model staleness or cold-start concerns. Focus on algorithmic recommendations.
- **Small catalog**: catalogs with <1000 items may not need diversity constraints because the recommendation space is already small.

## Severity Guidance

| Finding | Severity |
|---|---|
| No recommendation path for new users (empty results) | Critical |
| Recommendation API leaks sensitive user preferences | Critical |
| Recommendation loop with no exposure-bias correction | Important |
| Implicit feedback treated as uniform signal (click = purchase) | Important |
| Stale model with no retrain schedule | Important |
| Popularity bias dominates -- personalization adds no value | Important |
| No fallback when personalized model errors | Important |
| No online A/B test for recommendation quality | Minor |
| No diversity constraint in recommendation list | Minor |
| User interaction data retained without consent policy | Minor |

## See Also

- `data-vector-modeling` -- item and user embeddings used for recommendation follow vector modeling best practices
- `principle-separation-of-concerns` -- candidate generation, ranking, and re-ranking should be separate stages
- `compliance-gdpr-data-subject-rights` -- user interaction data is personal data subject to GDPR
- `reliability-graceful-degradation` -- recommendation service must degrade gracefully to fallback when model is unavailable

## Authoritative References

- [Yifan Hu, Yehuda Koren, Chris Volinsky, "Collaborative Filtering for Implicit Feedback Datasets" (2008)](http://yifanhu.net/PUB/cf.pdf)
- [James Bennett & Stan Lanning, "The Netflix Prize" (KDD Cup, 2007)](https://www.cs.uic.edu/~liub/KDD-cup-2007/proceedings/The-Netflix-Prize-Bennett.pdf)
- [Tobias Schnabel et al., "Recommendations as Treatments" (ICML, 2016)](https://arxiv.org/abs/1602.05352)
- [Google, "Recommendations AI Best Practices"](https://cloud.google.com/recommendations-ai/docs/best-practices)
- [Eugene Yan, "System Design for Recommendations and Search" (2022)](https://eugeneyan.com/writing/system-design-for-discovery/)
