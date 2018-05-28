import compose from './compose'

/**
 * 创建一个将 middleware 应用于 dispatch 的 store enhancer. 这对于很多任务来说是很有用的，
 * 例如以很简单的方式进行异步操作、打印每个 action 的参数等等...
 *
 * 有些 middleware 可能是异步的，所以当有多个 store enhancer 的时候，applyMiddleware 应该
 * 放在组合链的第一位.
 *
 * 注意：每个 middleware 都会被赋予具名函数 dispatch 和 getState.
 *
 * @param {...Function} middlewares 将要被应用的 middleware 链.
 * @returns {Function} 应用了 middleware 的 store enhancer.
 */
export default function applyMiddleware(...middlewares) {
  return createStore => (...args) => {
    const store = createStore(...args)
    let dispatch = () => {
      throw new Error(
        `Dispatching while constructing your middleware is not allowed. ` +
          `Other middleware would not be applied to this dispatch.`
      )
    }

    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args)
    }
    const chain = middlewares.map(middleware => middleware(middlewareAPI))
    dispatch = compose(...chain)(store.dispatch)

    return {
      ...store,
      dispatch
    }
  }
}
