#!/usr/bin/env node
//
// TODO: actually print out a dependency tree
//
const usage = `
npmls [-h]
  ls - ls using globs on your local node_modules folder
`

const argv = require("minimist")(process.argv.slice(2), {
  alias: {
    help: 'h',
    global: 'g',
    all: 'a'
  },
  boolean: ['h', 'g', 'a']
});

if (argv.help) {
  console.log(usage);
  process.exit();
}
const isGlobal = argv.global;
const showAllDeps = argv.all;

const Promise = require("promise");
const fs = require("fs");
const path = require("path");
const minimatch = require("minimatch");
const exec = require("child_process").exec;
const findup = require("./wrappers/findup");

const matcherSpecs = argv._.length ? argv._ : ["*"];
const matchers = matcherSpecs.map(matcherSpec => minimatch.makeRe(matcherSpec));


const getGlobalPath = () => new Promise((resolve, reject) => {
  exec('npm root -g', (error, stdout, stderr) => {
    if (error) return reject(error, stderr);
    const nodeModulesPath = stdout;
    resolve(path.resolve(nodeModulesPath, '..'));
  })
})
const getLocalPath = () => findup(process.cwd(), 'package.json')
const getRootPath = () => {
  if (isGlobal) return getGlobalPath();
  return getLocalPath();
}

const getDependencies = packageJson => Object.assign({},
    packageJson.dependencies || {},
    packageJson.devDependencies || {});

getRootPath().then(dir => {
  let parentPackageJson;
  try {
    parentPackageJson = require(path.join(dir, "package.json"));
  } catch (e) {
    parentPackageJson = null;
  }
  const nodeModulesPath = path.join(dir, "node_modules");
  const parentDependencies = getDependencies(parentPackageJson || {});
  
  return Promise.resolve(fs.readdirSync(nodeModulesPath))
    .then(nodeModuleNames => {
      //console.log('nodeModuleNames', nodeModuleNames)
      return nodeModuleNames.filter(nodeModuleName => {
        for (let i = 0; i < matchers.length; i+=1) {
          let matcher = matchers[0];
          if (matcher.test(nodeModuleName)) {
            return true;
          }
        }
        return false;
      });
    })
    .then(filteredNodeModuleNames => filteredNodeModuleNames.map(
      filteredNodeModuleName => {
        const packageJson = require(path.join(nodeModulesPath, filteredNodeModuleName, "package.json"));
        return Object.assign({}, packageJson, {
          _direct: !!parentDependencies[packageJson.name]
        });
      }
    ))
    .then(filteredPackageJsons => {
      filteredPackageJsons.forEach(packageJson => {
        const {name, version, _direct} = packageJson;
        const shouldShowLocal = _direct
          ? true
          : showAllDeps;
        if (!isGlobal && !shouldShowLocal) return;
        const prefix = (isGlobal || _direct)
          ? " - "
          : " -- ";
        console.log(`${prefix}${name}@${version}`);
      })
    });
})
.catch(e => {
  console.error(e);
});

