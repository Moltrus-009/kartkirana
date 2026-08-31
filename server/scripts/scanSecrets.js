const fs = require('fs');
const path = require('path');

const WORKSPACE_DIR = path.join(__dirname, '..', '..');

// Regex patterns to check
const PATTERNS = [
  { name: 'Private Key Block', regex: /-----BEGIN[A-Z0-9 ]*PRIVATE KEY-----/i },
  { name: 'Firebase Service Account Type', regex: /"type":\s*"service_account"/ },
  { name: 'Razorpay / Stripe Live Secret Key Prefix', regex: /(rzp_live_|sk_live_)[A-Za-z0-9]+/ },
  { name: 'Razorpay Secret Assignment', regex: /RAZORPAY_KEY_SECRET(?:_[A-Z]+)?[ \t]*=[ \t]*(?!(?:your_|replace|example|dummy|changeme|<))[^\s#][^\r\n#]*/i },
  { name: 'AWS Access Key ID Assignment', regex: /(aws_access_key_id|aws_access_key)\s*[:=]\s*['"]?[A-Z0-9]{20}['"]?/i },
  { name: 'AWS Secret Access Key Assignment', regex: /(aws_secret_access_key|aws_secret_key|aws_secret)\s*[:=]\s*['"]?[A-Za-z0-9/+=]{40}['"]?/i },
  { name: 'JWT/Session Secret Assignment', regex: /(JWT_SECRET|SESSION_SECRET|COOKIE_SECRET)\s*=\s*.+/i },
  { name: 'Database Connection Link', regex: /(mongodb\+srv|postgres|redis):\/\/[A-Za-z0-9_]+:[A-Za-z0-9_]+@/i },
  { name: 'OpenAI API Key Assignment', regex: /open_?ai_?api_?key\s*[:=]\s*['"]?sk-[A-Za-z0-9]{32,}['"]?/i },
  { name: 'Google Cloud Credentials Env Assignment', regex: /GOOGLE_APPLICATION_CREDENTIALS\s*=\s*.+/ },
  { name: 'Naked Firebase API Key in Code', regex: /(^|[^A-Za-z0-9_])AIzaSy[A-Za-z0-9_\-]{33}([^A-Za-z0-9_]|$)/ }
];

// File types to scan
const SCAN_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.json', '.xml', '.properties', 
  '.gradle', '.plist', '.yaml', '.yml', '.env', '.example', 'Dockerfile'
];

// Paths to ignore completely
const IGNORED_PATHS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  '.gradle',
  '.idea',
  'admin_storage.db',
];

// Helper to check base64 leaks
const BASE64_REGEX = /[A-Za-z0-9+/=]{120,}/g;

let failScan = false;
const findings = [];

function scanFile(filePath) {
  const basename = path.basename(filePath);
  
  // Skip specific authorized configuration files or scanner script itself
  if (basename === 'serviceAccountKey.json' || 
      basename === 'scanSecrets.js' || 
      filePath.includes('google-services') || 
      filePath.includes('GoogleService-Info.plist') ||
      /^\.env\.(?:local|development\.local|test\.local|production\.local)$/.test(basename)) {
    return;
  }

  const isEnvFile = basename === '.env' || basename === '.env.example' || basename.startsWith('.env.');
  const isMinifiedJs = basename.includes('.js') && (filePath.includes('/assets/') || filePath.includes('\\assets\\') || filePath.includes('/public/') || filePath.includes('\\public\\'));

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Run pattern checks
    PATTERNS.forEach(({ name, regex }) => {
      // Firebase api keys are public. Skip flagging them inside .env config files or minified build assets
      if (name === 'Naked Firebase API Key in Code' && (isEnvFile || isMinifiedJs)) {
        return;
      }

      const match = content.match(regex);
      if (match) {
        // Double check: if it's the expected public Firebase key setting, allow it
        if (name === 'Naked Firebase API Key in Code' && match[0].includes('VITE_FIREBASE_API_KEY')) {
          return;
        }

        failScan = true;
        findings.push({
          file: path.relative(WORKSPACE_DIR, filePath),
          type: name,
          detail: /secret|private|credential/i.test(name)
            ? '[REDACTED: sensitive value matched]'
            : match[0].trim().substring(0, 60)
        });
      }
    });

    // 2. Check for VITE_RAZORPAY_KEY_SECRET leak specifically
    if (content.includes('VITE_RAZORPAY_KEY_SECRET') && !filePath.includes('scanSecrets.js')) {
      failScan = true;
      findings.push({
        file: path.relative(WORKSPACE_DIR, filePath),
        type: 'Boilerplate Razorpay Secret Key Leak',
        detail: 'VITE_RAZORPAY_KEY_SECRET reference detected'
      });
    }

    // 3. Scan for large base64 blobs that resemble raw private keys (excluding minified code, SVGs, or package-lock)
    if (SCAN_EXTENSIONS.includes(path.extname(filePath)) && !isEnvFile && !isMinifiedJs && !filePath.includes('package-lock.json')) {
      const base64Matches = content.match(BASE64_REGEX);
      if (base64Matches) {
        base64Matches.forEach(match => {
          if (match.includes('image/svg+xml') || match.includes('<svg') || match.includes('data:image')) {
            return;
          }
          if (match.length > 150) {
            failScan = true;
            findings.push({
              file: path.relative(WORKSPACE_DIR, filePath),
              type: 'Suspicious Large Base64 Blob (potential credential)',
              detail: `${match.substring(0, 50)}...`
            });
          }
        });
      }
    }

  } catch (err) {
    // Skip binary or unreadable files
  }
}

function walkDir(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    // Skip ignored paths
    if (IGNORED_PATHS.some(ignored => fullPath.includes(path.sep + ignored + path.sep) || fullPath.endsWith(path.sep + ignored) || file === ignored)) {
      return;
    }

    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else {
      const ext = path.extname(file);
      const isScanType = SCAN_EXTENSIONS.includes(ext) || file === 'Dockerfile' || file === 'pre-commit';
      if (isScanType) {
        scanFile(fullPath);
      }
    }
  });
}

console.log('[SECURITY SCANNER] Beginning repository-wide credential audit...');
walkDir(WORKSPACE_DIR);

if (failScan) {
  console.error('\n❌ [SECURITY SCAN FAILURE] Sensitive credentials or secrets detected in workspace:');
  console.table(findings);
  console.error('\nPlease remove all secrets immediately before committing or deploying to production.');
  process.exit(1);
} else {
  console.log('\n✅ [SECURITY SCAN PASSED] Zero secrets detected in audited workspace. Safe to proceed.');
  process.exit(0);
}
