// ==UserScript==
// @name         control-app Client Example
// @namespace    https://your-domain.example
// @version      1.0.0
// @description  Example client for the private control-app API.
// @match        https://example.com/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @connect      your-api.vercel.app
// ==/UserScript==

(async function () {
  'use strict';

  /**
   * Base URL for the deployed control-app API.
   * @type {string}
   */
  const API_BASE_URL = 'https://your-api.vercel.app';

  /**
   * Current userscript version sent to the API for audit events.
   * @type {string}
   */
  const SCRIPT_VERSION = '1.0.0';

  GM.registerMenuCommand('Set License Token', async () => {
    const token = prompt('License token:');

    if (token) {
      await GM.setValue('licenseToken', token.trim());
      alert('License token saved.');
    }
  });

  GM.registerMenuCommand('Clear License Token', async () => {
    await GM.setValue('licenseToken', '');
    alert('License token cleared.');
  });

  /**
   * Reads or creates the persistent browser/profile device id.
   * @returns {Promise<string>} The Tampermonkey device id.
   */
  async function getDeviceId() {
    let deviceId = await GM.getValue('deviceId', '');

    if (!deviceId) {
      deviceId = crypto.randomUUID();
      await GM.setValue('deviceId', deviceId);
    }

    return deviceId;
  }

  /**
   * Reads the current account profile from your own userscript context.
   * @returns {object|null} The account profile snapshot or null when unavailable.
   */
  function getAccountProfile() {
    // Replace this with the profile object you already have in your userscript.
    // Example shape: { id, name, discord, discordId, country, allianceName, level, pixelsPainted }.
    return window.__CURRENT_ACCOUNT_PROFILE__ || null;
  }

  /**
   * Reads an optional raw account token from your own app flow.
   * @returns {string|null} The optional raw account token or null.
   */
  function getOptionalAccountTokenFromYourOwnAppCache() {
    // Connect your own app/cache here only when it is your own flow or you have user consent.
    // The backend stores this raw value in account_token_raw because this is a test project.
    return null;
  }

  /**
   * Calls the license-only endpoint without registering the current device.
   * @returns {Promise<object>} The license validation response.
   */
  async function validateLicenseOnly() {
    const licenseToken = await GM.getValue('licenseToken', '');

    if (!licenseToken) {
      return { valid: false, reason: 'missing_local_license_token' };
    }

    const response = await fetch(`${API_BASE_URL}/api/license/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: licenseToken
      })
    });

    return response.json();
  }

  /**
   * Calls the main control endpoint and returns whether the script can continue.
   * @param {'check'|'heartbeat'|'painted'|'denied'|'logout'} eventType The event type to store.
   * @param {Record<string, unknown>} metadata Extra event metadata.
   * @returns {Promise<boolean>} True when the API allows the script to continue.
   */
  async function callControlApi(eventType, metadata = {}) {
    const licenseToken = await GM.getValue('licenseToken', '');
    const deviceId = await getDeviceId();
    const profile = getAccountProfile();
    const accountToken = getOptionalAccountTokenFromYourOwnAppCache();

    const response = await fetch(`${API_BASE_URL}/api/script/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: licenseToken || null,
        deviceId,
        eventType,
        scriptVersion: SCRIPT_VERSION,
        currentUrl: location.href,
        storageKey: 'Tampermonkey:licenseToken/deviceId',
        account: profile,
        accountToken,
        metadata
      })
    });

    const result = await response.json();

    if (!result.allowed) {
      console.warn('[control-app] Blocked:', result.reason);
      alert(result.reason || 'This script is not authorized.');
      return false;
    }

    if (result.message) {
      console.info('[control-app]', result.message);
    }

    return true;
  }

  // Optional quick validation. The real control still happens through /api/script/check.
  // const licenseStatus = await validateLicenseOnly();
  // console.log('[control-app] License status:', licenseStatus);

  const allowed = await callControlApi('check');

  if (!allowed) {
    return;
  }

  // Run your real script logic here.
  // paintSomething();

  await callControlApi('painted', {
    paintedAt: new Date().toISOString(),
    note: 'Replace this metadata with your real paint result.'
  });
})();
