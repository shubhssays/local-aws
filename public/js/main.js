import {
  state, navigate, openModal, closeModal, handleConfirm, toggleTheme,
  checkHealth, refreshAll, getTheme, updateThemeIcon, formatJson, insertSample,
} from './core.js';
import { loadQueues, handleSqsAction, initSqsListeners } from './sqs.js';
import { loadBuckets, handleS3Action, initS3Listeners, renderBrowserEmpty } from './s3.js';
import { handleDynamoAction, initDynamoListeners } from './dynamodb.js';
import { handleSnsAction, initSnsListeners } from './sns.js';
import { handleSecretsAction, initSecretsListeners } from './secrets.js';
import { handleLambdaAction, initLambdaListeners } from './lambda.js';
import { handleLogsAction, initLogsListeners } from './logs.js';
import { handleEventbridgeAction, initEventbridgeListeners } from './eventbridge.js';
import { handleStepfunctionsAction, initStepfunctionsListeners } from './stepfunctions.js';
import { handleSettingsAction, initSettingsListeners } from './settings.js';

const SQS_ACTIONS = new Set([
  'create-queue', 'publish-message', 'add-publish-attribute', 'remove-publish-attribute',
  'peek-messages', 'fetch-messages', 'set-peek-mode', 'redrive-messages', 'publish-to-queue',
  'purge-queue', 'delete-queue', 'delete-message',
]);

const S3_ACTIONS = new Set([
  'create-bucket', 'delete-bucket', 'open-bucket', 'object-details', 'object-tab',
  'object-preview', 'open-copy-object', 'confirm-copy-object', 'open-rename-object',
  'confirm-rename-object', 'copy-field', 'copy-presign-url', 'create-folder',
  'delete-object', 'close-object-inspector', 'load-more-objects', 'upload-files',
]);

const DYNAMO_ACTIONS = new Set([
  'create-table', 'delete-table', 'open-table', 'load-more-items', 'put-item',
  'edit-item', 'delete-item', 'seed-table',
]);

const SNS_ACTIONS = new Set([
  'create-topic', 'delete-topic', 'open-subscribe-sns', 'subscribe-sns', 'unsubscribe',
  'publish-to-topic', 'sns-publish-message',
]);

const SECRETS_ACTIONS = new Set([
  'create-secret', 'view-secret', 'toggle-secret-reveal', 'copy-secret-value', 'delete-secret',
  'create-parameter', 'view-parameter', 'toggle-param-reveal', 'copy-param-value', 'delete-parameter',
]);

const LAMBDA_ACTIONS = new Set(['invoke-function', 'invoke-lambda', 'view-lambda-logs', 'view-logs']);

const LOGS_ACTIONS = new Set(['open-log-group', 'refresh-logs', 'refresh-log-events', 'toggle-log-auto-refresh']);

const EVENTBRIDGE_ACTIONS = new Set(['delete-rule', 'send-event', 'send-event-modal']);

const SFN_ACTIONS = new Set(['start-execution', 'start-sfn-execution', 'view-executions', 'view-execution-history']);

const SETTINGS_ACTIONS = new Set([
  'save-settings', 'reset-settings', 'new-profile', 'save-profile',
  'activate-profile', 'delete-profile', 'select-profile',
]);

function toggleSidebarSection(el) {
  const section = el.closest('.sidebar-section');
  if (!section) return;
  const expanded = el.getAttribute('aria-expanded') !== 'true';
  el.setAttribute('aria-expanded', String(expanded));
  section.classList.toggle('collapsed', !expanded);
}

function handleGlobalAction(action, el, event) {
  switch (action) {
    case 'navigate':
      navigate(el.dataset.page, el);
      break;
    case 'open-modal':
      openModal(el.dataset.modal);
      break;
    case 'close-modal':
      closeModal(el.dataset.modal);
      break;
    case 'refresh-all':
      refreshAll();
      break;
    case 'confirm-ok':
      handleConfirm(true);
      break;
    case 'confirm-cancel':
      handleConfirm(false);
      break;
    case 'toggle-theme':
      toggleTheme();
      break;
    case 'toggle-sidebar-section':
      toggleSidebarSection(el);
      break;
    case 'format-json':
      formatJson(el.dataset.target);
      break;
    case 'insert-sample':
      insertSample(el.dataset.target);
      break;
  }
}

function dispatchAction(action, el, event) {
  if (SQS_ACTIONS.has(action)) return handleSqsAction(action, el);
  if (S3_ACTIONS.has(action)) return handleS3Action(action, el, event);
  if (DYNAMO_ACTIONS.has(action)) return handleDynamoAction(action, el);
  if (SNS_ACTIONS.has(action)) return handleSnsAction(action, el);
  if (SECRETS_ACTIONS.has(action)) return handleSecretsAction(action, el);
  if (LAMBDA_ACTIONS.has(action)) return handleLambdaAction(action, el);
  if (LOGS_ACTIONS.has(action)) return handleLogsAction(action, el);
  if (EVENTBRIDGE_ACTIONS.has(action)) return handleEventbridgeAction(action, el);
  if (SFN_ACTIONS.has(action)) return handleStepfunctionsAction(action, el);
  if (SETTINGS_ACTIONS.has(action)) return handleSettingsAction(action, el);
  handleGlobalAction(action, el, event);
}

function initEventDelegation() {
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.card-clickable[data-action="open-bucket"]');
    if (card && !e.target.closest('[data-action="delete-bucket"]')) {
      handleS3Action('open-bucket', card, e);
      return;
    }

    const el = e.target.closest('[data-action]');
    if (!el) return;
    dispatchAction(el.dataset.action, el, e);
  });

  document.querySelectorAll('.modal-overlay').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target === el && el.id !== 'modal-confirm') {
        el.classList.remove('open');
        el.setAttribute('aria-hidden', 'true');
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openModalEl = document.querySelector('.modal-overlay.open');
    if (openModalEl) {
      if (openModalEl.id === 'modal-confirm') handleConfirm(false);
      else closeModal(openModalEl.id);
    }
  });
}

function init() {
  state.theme = getTheme();
  updateThemeIcon();
  initEventDelegation();
  initSqsListeners();
  initS3Listeners();
  initDynamoListeners();
  initSnsListeners();
  initSecretsListeners();
  initLambdaListeners();
  initLogsListeners();
  initEventbridgeListeners();
  initStepfunctionsListeners();
  initSettingsListeners();

  checkHealth();
  loadQueues();
  loadBuckets({ silent: true });
  renderBrowserEmpty();
}

document.addEventListener('DOMContentLoaded', init);
