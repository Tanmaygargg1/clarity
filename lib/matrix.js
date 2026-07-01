/**
 * Pure JS matrix math utilities for OLS regression.
 * Matrices are arrays of arrays: [[r1c1, r1c2], [r2c1, r2c2], ...]
 */

/**
 * Transpose a matrix.
 * @param {number[][]} M
 * @returns {number[][]}
 */
export function transpose(M) {
  if (!M || M.length === 0) return [];
  const rows = M.length;
  const cols = M[0].length;
  const T = [];
  for (let j = 0; j < cols; j++) {
    T[j] = [];
    for (let i = 0; i < rows; i++) {
      T[j][i] = M[i][j];
    }
  }
  return T;
}

/**
 * Multiply two matrices A (m x n) and B (n x p).
 * @param {number[][]} A
 * @param {number[][]} B
 * @returns {number[][]}
 */
export function multiply(A, B) {
  const m = A.length;
  const n = A[0].length;
  const p = B[0].length;
  const C = [];
  for (let i = 0; i < m; i++) {
    C[i] = [];
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += A[i][k] * B[k][j];
      }
      C[i][j] = sum;
    }
  }
  return C;
}

/**
 * Invert a square matrix using Gaussian elimination with partial pivoting.
 * Suitable for small matrices (up to ~10x10).
 * @param {number[][]} M - square matrix
 * @returns {number[][]} inverse
 */
export function inverse(M) {
  const n = M.length;
  // Augment M with identity matrix
  const aug = M.map((row, i) => {
    const identity = new Array(n).fill(0);
    identity[i] = 1;
    return [...row, ...identity];
  });

  // Forward elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    // Find pivot row
    let maxVal = Math.abs(aug[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    // Swap rows
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-14) {
      throw new Error('Matrix is singular or nearly singular');
    }

    // Normalize pivot row
    for (let j = 0; j < 2 * n; j++) {
      aug[col][j] /= pivot;
    }

    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Extract right half (inverse)
  return aug.map((row) => row.slice(n));
}

/**
 * Prepend a column of 1s to a matrix (for OLS intercept).
 * @param {number[][]} X - n x k matrix
 * @returns {number[][]} n x (k+1) matrix with first column all 1s
 */
export function addConstant(X) {
  return X.map((row) => [1, ...row]);
}

/**
 * Two-sided p-value approximation from t-distribution.
 * Uses normal approximation for large df; Abramowitz & Stegun for normal CDF.
 * @param {number} t - t-statistic (absolute value used internally)
 * @param {number} df - degrees of freedom
 * @returns {number} two-sided p-value in [0,1]
 */
export function tDist2P(t, df) {
  const absT = Math.abs(t);

  // For df > 30, t-distribution closely approximates normal
  // Use Abramowitz & Stegun approximation for the standard normal CDF
  function normalCDF(z) {
    const absZ = Math.abs(z);
    // A&S formula 26.2.17
    const p = 0.2316419;
    const b = [0.319381530, -0.356563782, 1.781477937, -1.821255978, 1.330274429];
    const t_ = 1 / (1 + p * absZ);
    const poly = t_ * (b[0] + t_ * (b[1] + t_ * (b[2] + t_ * (b[3] + t_ * b[4]))));
    const pdf = Math.exp(-0.5 * absZ * absZ) / Math.sqrt(2 * Math.PI);
    const cdf = 1 - pdf * poly;
    return z >= 0 ? cdf : 1 - cdf;
  }

  if (df >= 30) {
    // Use normal approximation
    const p = 2 * (1 - normalCDF(absT));
    return Math.max(0, Math.min(1, p));
  }

  // For small df, use a simple numerical integration approximation
  // Beta function incomplete: I_x(a,b) where x = df/(df+t^2)
  // P-value = I_x(df/2, 0.5)
  const x = df / (df + absT * absT);

  // Regularized incomplete beta function via continued fraction (Lentz method)
  function betaCF(x, a, b) {
    const MAXIT = 200;
    const EPS = 3e-7;
    const FPMIN = 1e-30;
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;
    let c = 1;
    let d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }

  function logGamma(z) {
    // Lanczos approximation
    const g = 7;
    const c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    if (z < 0.5) {
      return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    }
    z -= 1;
    let x = c[0];
    for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  function betaI(x, a, b) {
    if (x < 0 || x > 1) return 0;
    if (x === 0 || x === 1) return x;
    const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
    const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
    if (x < (a + 1) / (a + b + 2)) {
      return front * betaCF(x, a, b);
    } else {
      return 1 - (Math.exp(Math.log(1 - x) * b + Math.log(x) * a - lbeta) / b) * betaCF(1 - x, b, a);
    }
  }

  const p = betaI(x, df / 2, 0.5);
  return Math.max(0, Math.min(1, p));
}

/**
 * OLS regression: y = Xβ + ε
 * @param {number[][]} X_data - n x k matrix of regressors (without intercept)
 * @param {number[]} y_data - n-length array of response variable
 * @returns {{ coefficients: number[], residuals: number[], rSquared: number, tStats: number[], pValues: number[], stderr: number[] }}
 */
export function ols(X_data, y_data) {
  const n = y_data.length;
  if (n === 0 || X_data.length === 0) {
    throw new Error('Empty data passed to OLS');
  }

  // 1. Add intercept column
  const X = addConstant(X_data);
  const k = X[0].length; // number of parameters including intercept

  // Convert y to column vector (n x 1) represented as n x 1 array of arrays
  const y = y_data.map((v) => [v]);

  // 2. beta = (X'X)^-1 X'y
  const Xt = transpose(X);
  const XtX = multiply(Xt, X);
  const XtXinv = inverse(XtX);
  const Xty = multiply(Xt, y);
  const betaMat = multiply(XtXinv, Xty);
  const coefficients = betaMat.map((r) => r[0]);

  // 3. residuals = y - X*beta
  const Xbeta = multiply(X, betaMat);
  const residuals = y_data.map((yi, i) => yi - Xbeta[i][0]);

  // 4. sigma^2 = sum(e^2) / (n - k)
  const sse = residuals.reduce((acc, e) => acc + e * e, 0);
  const df = n - k;
  const sigma2 = df > 0 ? sse / df : 0;

  // 5. var(beta) = sigma^2 * diag((X'X)^-1)
  const varBeta = XtXinv.map((row, i) => sigma2 * row[i]);
  const stderr = varBeta.map((v) => Math.sqrt(Math.max(0, v)));

  // 6. t-stats = beta / stderr
  const tStats = coefficients.map((b, i) => (stderr[i] > 0 ? b / stderr[i] : 0));

  // 7. p-values from t-distribution
  const pValues = tStats.map((t) => tDist2P(t, df));

  // R-squared
  const yMean = y_data.reduce((a, b) => a + b, 0) / n;
  const sst = y_data.reduce((acc, yi) => acc + (yi - yMean) ** 2, 0);
  const rSquared = sst > 0 ? 1 - sse / sst : 0;

  return { coefficients, residuals, rSquared, tStats, pValues, stderr };
}
