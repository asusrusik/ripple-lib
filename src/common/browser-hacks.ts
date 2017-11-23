

function setPrototypeOf(object: Object, prototype) {
  Object.setPrototypeOf ?
    Object.setPrototypeOf(object, prototype) :
    // @ts-ignore: Specifically a fallback for IE9
    object.__proto__ = prototype;
}

function getConstructorName(object: Object): string {
  // hack for internet explorer
  return process.browser ?
    object.constructor.toString().match(/^function\s+([^(]*)/)[1] :
    object.constructor.name
}

export {
  getConstructorName,
  setPrototypeOf
}
