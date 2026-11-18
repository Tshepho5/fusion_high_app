'use strict';

/**
 * Loaded with node --require before any test file or application module.
 * The bootstrap strips production credentials and installs the network block
 * before Firebase, PostgreSQL, or external-service modules are imported.
 */
require('./blockLiveEffects');
