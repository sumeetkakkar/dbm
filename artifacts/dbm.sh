dbm_getpath() {
  local scriptPath="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
  #echo $scriptPath
  local linkPath=$(readlink "${scriptPath}")
  if [ -n "${linkPath}" ]; then
    #echo $linkPath
    scriptPath="$( cd "${scriptPath}" && cd .. && cd "${linkPath}" &> /dev/null && pwd )"
  fi
  echo ${scriptPath}
}

DBM_SCRIPT_PATH=$(dbm_getpath)
DBM_BIN=${DBM_SCRIPT_PATH}/../bin/dbm-cli.js

dbm_error() {
  local YELLOW='\033[0;33m'
  local RED='\033[0;31m'
  local NC='\033[0m' # No Color
  >&2 echo -e "${YELLOW}[exec error]${RED} $@${NC}"
}

dbm_path() {
  #local bundle=$1
  #if [ -z "${bundle}" ]; then
  #  dbm_error "Bundle name is required!!"
  #  return 2
  #fi
  #local version=$2
  # Internally reads installed version (folders) 
  # and evaluates partial versions
  #local path=$(node ${DBM_BIN} path "${bundle}" "${version}")
  local path=$(node ${DBM_BIN} path $*)
  if [ -z $path ]; then
    dbm_error "Unable to find bundle!!"
    return 1
  fi
  echo ${path}
}

dbm_use() {
  #local bundle=$1
  #local version=$2 
  #local bundle_path=$(dbm_path "${bundle}" "${version}")
  local bundle_path=$(dbm_path $*)
  if [ -z ${bundle_path} ]; then
    return 1
  fi
  
  #echo $bundle_path
  #echo ${NODE_PATH}
  if [ -z "${NODE_PATH}" ]; then
    export NODE_PATH=${bundle_path}
  else
    #local rpath=`dirname $(dirname ${bundle_path})`
    local rpath=$(sed "s/\/[^\/]*\/node_modules//" <<< ${bundle_path})
    rpath=$(sed "s,\/,\\\\\/,g" <<< ${rpath})
    local node_path=$(sed "s/:*${rpath}\/[^\/]*\/node_modules//" <<< ${NODE_PATH})
    #echo $rpath
    node_path=$(sed "s/^:*//" <<< ${node_path})
    if [ -z "${node_path}" ]; then
      export NODE_PATH=${bundle_path}
    else
      export NODE_PATH=${bundle_path}:${node_path}
    fi
  fi
  echo "NODE_PATH=$NODE_PATH"
}
alias dbm.use=dbm_use

dbm() {
  local command=$1
  case ${command} in
    "use")
      shift
      dbm_use $*
    ;;
    *)
      node "${DBM_BIN}" $*
    ;;
  esac
}

#NODE_PATH=/123/523:${bundle_path}
#NODE_PATH=/1234:${bundle_path}:/123/523
#dbm_use dbm 1
#dbm_use dbm 1