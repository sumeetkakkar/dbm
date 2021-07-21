// 'use strict';

// function parseArg(arg) {
//   const idx = arg.indexOf('=');
//   return (idx < 0) ? 
//     [ arg ] :
//     [ arg.slice(0,idx), arg.slice(idx+1) ];
// }
// function * getOptions(options=new Map(), args=[]) {
//   for (let i = 0; i < args.length; i++) {
//     const arg = args[i];
//     const [ opt, oval ] = parseArg(arg);
//     if (!options.has(opt)) {
//       break;
//     }
//     const { name, type } = options.get(opt) || {};
//     if (details && typeof details === 'object') {

//     } else {
//       yield 
//     }


//   }
// }