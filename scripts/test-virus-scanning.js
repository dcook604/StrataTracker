#!/usr/bin/env node

/**
 * StrataTracker Virus Scanning Test Script
 * This script tests the virus scanning implementation end-to-end
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('=========================================');
console.log('  StrataTracker Virus Scanning Test');
console.log('=========================================\n');

// Test configuration
const testConfig = {
  testFilesDir: path.join(__dirname, '..', 'test-files'),
  uploadsDir: path.join(__dirname, '..', 'uploads'),
  serverUrl: 'http://localhost:3001',
  eicarTestString: 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
};

// Test results tracker
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

function logTest(name, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✓ ${name}`);
  } else {
    testResults.failed++;
    console.log(`✗ ${name}`);
    if (details) console.log(`  ${details}`);
  }
  testResults.details.push({ name, passed, details });
}

async function checkPrerequisites() {
  console.log('1. Checking Prerequisites...\n');
  
  // Check if ClamAV is installed
  try {
    const clamavVersion = await runCommand('clamscan', ['--version']);
    logTest('ClamAV installation', true, clamavVersion.trim());
  } catch (error) {
    logTest('ClamAV installation', false, 'ClamAV not found or not installed');
    return false;
  }
  
  // Check if ClamAV daemon is running
  try {
    await runCommand('systemctl', ['is-active', 'clamav-daemon']);
    logTest('ClamAV daemon status', true);
  } catch (error) {
    logTest('ClamAV daemon status', false, 'Daemon not running');
  }
  
  // Check ClamAV socket
  const socketPath = '/var/run/clamav/clamd.ctl';
  const socketExists = fs.existsSync(socketPath);
  logTest('ClamAV socket exists', socketExists, socketPath);
  
  // Check virus database
  try {
    const dbStats = await runCommand('ls', ['-la', '/var/lib/clamav/']);
    const hasMainDb = dbStats.includes('main.cvd') || dbStats.includes('main.cld');
    const hasDailyDb = dbStats.includes('daily.cvd') || dbStats.includes('daily.cld');
    logTest('Virus database present', hasMainDb && hasDailyDb);
  } catch (error) {
    logTest('Virus database present', false, 'Cannot access virus database directory');
  }
  
  return true;
}

async function testClamAVFunctionality() {
  console.log('\n2. Testing ClamAV Functionality...\n');
  
  // Create test files directory
  if (!fs.existsSync(testConfig.testFilesDir)) {
    fs.mkdirSync(testConfig.testFilesDir, { recursive: true });
  }
  
  // Test 1: Clean file detection
  const cleanFilePath = path.join(testConfig.testFilesDir, 'clean-test.txt');
  fs.writeFileSync(cleanFilePath, 'This is a clean test file.');
  
  try {
    const cleanResult = await runCommand('clamscan', ['--no-summary', cleanFilePath]);
    const isClean = !cleanResult.includes('FOUND');
    logTest('Clean file detection', isClean);
  } catch (error) {
    logTest('Clean file detection', false, error.message);
  }
  
  // Test 2: EICAR test virus detection
  const eicarFilePath = path.join(testConfig.testFilesDir, 'eicar-test.txt');
  fs.writeFileSync(eicarFilePath, testConfig.eicarTestString);
  
  try {
    const eicarResult = await runCommand('clamscan', ['--no-summary', eicarFilePath]);
    const virusDetected = eicarResult.includes('FOUND');
    logTest('EICAR virus detection', virusDetected);
  } catch (error) {
    // ClamAV returns non-zero exit code when virus is found, which is expected
    const virusDetected = error.message.includes('FOUND');
    logTest('EICAR virus detection', virusDetected);
  }
  
  // Test 3: Socket-based scanning (clamdscan)
  try {
    const socketResult = await runCommand('clamdscan', ['--no-summary', cleanFilePath]);
    const socketWorks = !socketResult.includes('ERROR');
    logTest('Socket-based scanning', socketWorks);
  } catch (error) {
    logTest('Socket-based scanning', false, 'clamdscan failed');
  }
  
  // Cleanup test files
  try {
    fs.unlinkSync(cleanFilePath);
    fs.unlinkSync(eicarFilePath);
  } catch (error) {
    // Ignore cleanup errors
  }
}

async function testNodeJSIntegration() {
  console.log('\n3. Testing Node.js Integration...\n');
  
  // Check if required packages are installed
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    logTest('clamscan package installed', !!dependencies.clamscan);
    logTest('file-type package installed', !!dependencies['file-type']);
    logTest('multer package installed', !!dependencies.multer);
  } else {
    logTest('package.json found', false);
  }
  
  // Test virus scanner service
  try {
    const virusScannerPath = path.join(__dirname, '..', 'server', 'services', 'virusScanner.ts');
    const middlewarePath = path.join(__dirname, '..', 'server', 'middleware', 'fileUploadSecurity.ts');
    
    logTest('Virus scanner service exists', fs.existsSync(virusScannerPath));
    logTest('File upload security middleware exists', fs.existsSync(middlewarePath));
  } catch (error) {
    logTest('Service files check', false, error.message);
  }
}

async function testEnvironmentConfiguration() {
  console.log('\n4. Testing Environment Configuration...\n');
  
  // Check for environment variables
  const virusScanningEnabled = process.env.VIRUS_SCANNING_ENABLED === 'true';
  logTest('VIRUS_SCANNING_ENABLED set', virusScanningEnabled);
  
  if (process.env.CLAMAV_SOCKET_PATH) {
    const socketExists = fs.existsSync(process.env.CLAMAV_SOCKET_PATH);
    logTest('Custom ClamAV socket path valid', socketExists);
  }
  
  // Check .env.example file
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  logTest('.env.example file exists', fs.existsSync(envExamplePath));
}

async function testAPIEndpoints() {
  console.log('\n5. Testing API Integration...\n');
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    // Test virus scanner health endpoint
    try {
      const response = await fetch(`${testConfig.serverUrl}/api/health/virus-scanner`);
      if (response.ok) {
        const data = await response.json();
        logTest('Virus scanner health endpoint', data.enabled);
        logTest('Virus scanner ready', data.ready);
      } else {
        logTest('Virus scanner health endpoint', false, `HTTP ${response.status}`);
      }
    } catch (error) {
      logTest('Virus scanner health endpoint', false, 'Server not accessible');
    }
  } catch (importError) {
    console.log('  Skipping API tests (node-fetch not available)');
  }
}

async function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || stdout));
      }
    });
    
    process.on('error', (error) => {
      reject(error);
    });
  });
}

function printSummary() {
  console.log('\n=========================================');
  console.log('           Test Summary');
  console.log('=========================================');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  
  if (testResults.failed > 0) {
    console.log('\nFailed Tests:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`  - ${test.name}`);
        if (test.details) console.log(`    ${test.details}`);
      });
  }
  
  console.log('\n=========================================');
  
  if (testResults.failed === 0) {
    console.log('🎉 All tests passed! Virus scanning is ready.');
    console.log('\nNext steps:');
    console.log('1. Ensure VIRUS_SCANNING_ENABLED=true in your .env file');
    console.log('2. Restart your StrataTracker application');
    console.log('3. Test file uploads through the web interface');
  } else {
    console.log('❌ Some tests failed. Please review the issues above.');
    console.log('\nTroubleshooting:');
    console.log('1. Run: sudo systemctl status clamav-daemon');
    console.log('2. Update virus database: sudo freshclam');
    console.log('3. Check permissions: sudo chown -R clamav:clamav /var/lib/clamav');
    console.log('4. Review documentation: docs/VIRUS_SCANNING_IMPLEMENTATION.md');
  }
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Main test execution
async function main() {
  try {
    await checkPrerequisites();
    await testClamAVFunctionality();
    await testNodeJSIntegration();
    await testEnvironmentConfiguration();
    await testAPIEndpoints();
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  } finally {
    printSummary();
  }
}

// Run tests
main().catch(console.error); 