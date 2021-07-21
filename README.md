> Dependency Bundle Manager


## PROBLEM OF SCALE

In an enterprise scenario there can be 100s of applications using core infrastructure dependencies / modules. 

Node.js applications typically manage their own dependencies, and use `package.json` and `package-lock.json`. Using global dependencies is uncommon. This means, rolling out an important non-breaking update / fix to all applications, needs rebuilding all applications with the updated dependencies.

Node.js runtime manages `core modules`, and these are not deployed with the application, and act as global. Following this concept, and managing infrastructure dependencies outside the application as a global bundle is a possible solution for better management and control on the core infrastructure dependencies. 

This can leverage mechanics used by Node.js `require` for resolving a module. While trying to resolve a dependency, `require` looks up for dependencies installed in the `node_modules` folder under the immediate parent directory, and continues to iterate through the parent folders to check other `node_modules` folders - stopping when either it finds the dependency, or it reaches the file-system root.

This process also involves looking up global folders starting with the one specified under `NODE_PATH` environment variable.

`require`'s mechanics of resolving dependencies can be leveraged, and the infra dependencies as a bundle can be deployed under one the candidate folder outside the application directory. This then can enable separating deployment process and life cycle of the infra dependencies from the application's release and deployment process.

Here's how a managed deployment can look like:

```
... /     path-of-app....     / app 
    |                         |
     _ node_modules           | 
       |                      |
        - infra dependencies  |
                               - node_modules
                                 |
                                  _ application dependencies
```

For all this to work effectively, dependencies should be compatible with one another. This means:

- avoid scenarios where multiple versions of a dependency gets included. i.e. all dependencies should expect the same version of a particular dependency. Ex: Dependencies A and B, should include the same semver of dependency C in their package.json to avoid multiple versions of C in the bundle.
- run test coverage for all infra dependencies while deployed as a bundle.
- follow [semver](https://semver.org/) rules of versioning while releasing a dependency bundle with new functionality, or with bug fixes. Breaking changes would require semver-major.


## CLI

This is to manage infra dependency bundles.

* There can be a need for multiple bundles within an organization for supporting different flavors of applications, like UI+API, API only, Batch.
* Need for supporting multiple major versions of the same bundle.
* Ideally an organization should expect all applications depending on a specific major version to use the latest minor+patch version.
* While developing, developers may need to deploy multiple bundle + version combinations at any time to support multiple applications they may be running / developing at any time. This tries to leverage the `NODE_PATH` environment variable supported by the `require` module of Node.js.
* CI jobs also need tools to deploy and manage multiple bundles, and allow selecting bundle name, version per job.


## Installation
```
$ npm install -g https://github.com/sumeetkakkar/dbm.git
# $ npm install -g dbm
```

Add following in .profile, .bash_profile, .bashrc, .zshrc
```
export DBM_DIR="$HOME/.ndb"
[ -s "$DBM_DIR/bin/dbm.sh" ] && \. "$DBM_DIR/bin/dbm.sh"  # This loads dbm
```


## Configuration

### CLI options
Individual commands support CLI options for accepting configurations needed by them.

### ini file
`.dbmrc` file is supported for setting configurations. File can be added under the project directory (or, one of it's parent). The file under the `HOME` directory is used as `default`.
Ex:
```
$ cat .dbmrc
store=git
repo=https://github.com/user_or_org
```

### environment values
The environment variables with names prepended with `dbm_config_` are also supported. These get higher precedence over configuration in `ini` files
Ex: `dbm_config_basedir` 


## Store

### Git
Bundles and the versions are managed in git repos (tested with github). Git `tags` are leveraged to maintain versions. Github's `release` creation process can be used for this, as this includes creation of git `tag`.

package.json and package-lock.json are expected under the bundle. Installation takes care of running `npm ci` to install the bundle.

#### Prerequisites
* git
* npm

There are two supported schemes.

#### Single repo for multiple bundles

* Bundles can be managed as separate branches.
* The git `tag` used for managing bundle versions must contain the bundle name (branch name) and the bundle version. ex: `mybundle/v1.2.3`. The parse logic is flexible and supports any scheme which makes sure that unique bundle name and bundle version are included in the git `tag`.

Supported options:
* `repo`: ssh or http url of the git repository ex: git@github.com:user_or_org/bundles.git or https://github.com/user_or_org/bundles.git
* `tag`: It can be used to specify the branch to use for installing files. If tag `latest` is passed in, it will result in installing files from the branch matching the bundle name.

If no version is inputted, the highest version based on semver rules is installed.

#### Repo per bundle

* Each bundle has its own git repo.
* The git `tag` used for managing bundle versions should have the exact version string. ex: `v1.2.3` or `1.2.3` or `1.2.3-beta.1`.

Supported options:
* `repo`: ssh or http url of the organization / user. Bundle repos are expected under this. ex: git@github.com:user_or_org or https://github.com/user_or_org
* `tag`: It can be used to specify the branch to use for installing files. If tag `latest` is passed in, it will result in installing files from either of `latest`, `master`, `main` branches.

If no version is inputted, the highest version based on semver rules is installed.

### Local
**FOR TESTING ONLY**

The bundle versions published are saved in a local directory. Path of the local directory is accepted as parameter **repo**.

The directory structure is
```
- <bundle-name>
  - metadata.json
  - <bundle-version-1>
    - metadata.json
    - bundle.tgz
  - <bundle-version-2>
    - metadata.json
    - bundle.tgz
  ...
```

#### Prerequisites
* tar
* npm


# Supported commands
## view, v
View the available bundle versions

## install, i
Installs the bundle version

## remove, rm
Remove the installed bundle versions

## list, ls, l
List the installed bundle versions

## use
Use the installed bundle version

## default
Set installed bundle version as default version for the bundle


# Extending CLI with custom store

Create your own CLI with custom store (`Store`) implementation, and invoke processCommand with `process.args`.

Ex:
```
const { registerStore, processCommand } = require('dbm');

registerStore('customstore', require.resolve('path/to/customstore'), true);

processCommand(<cli-name>, <cli-version>, process.args); 
```