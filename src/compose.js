/**
 * 按照从右至左的顺序组合单参数函数.
 * 最右边的函数可以接受多个参数，因为它提供了生成的复合函数的签名.
 *
 * 主要的作用是防止代码的向右偏移.
 * 就像这样：compose(f, g, h) <=> (...args) => f(g(h(...args))).
 *
 * 例子：compose(funcA, funcB, funcC, funcD)
 *
 * ==============Step 1==============
 * return1: (...args) => funcA(funcB(...args))
 * shape1: (...args) => funcA(funcB(...args))
 *
 * ==============Step 2==============
 * return2: (...args) => return1(funcC(...args))
 * shape2: (...args) => funcA(funcB(funcC(...args)))
 *
 * ==============Step 3==============
 * final return: (...args) => return2(funcD(...args))
 * final shape: (...args) => funcA(funcB(funcC(funcD(...args))))
 *
 * @param {...Function} funcs 需要合成的多个函数.
 * @returns {Function} 由参数中的函数从右至左组合而成的函数.
 */

export default function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}
