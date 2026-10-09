'use strict';

/** Local stub: avoids micromatch/braces (GHSA-vfj7-8cjw-p6xm). npm projects are not Yarn workspaces. */
module.exports = function findYarnWorkspaceRoot() {
  return null;
};
