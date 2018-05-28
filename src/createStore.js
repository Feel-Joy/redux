import $$observable from 'symbol-observable'

import ActionTypes from './utils/actionTypes'
import isPlainObject from './utils/isPlainObject'

/**
 * 创建一个 Redux store 来管理 state tree.
 * 唯一可以改变 store 数据的方式是调用它的 dispatch() 方法.
 *
 * 你的应用中应当只有一个 store. 要指定 state tree 的不同部分如何响应动作，可以使用
 * combineReducers() 将数个 reducer 组合成一个 reducer 函数.
 *
 * @param {Function} reducer 接收两个参数，分别是当前的 state tree 和要处理的 action，
 * 返回新的 state tree.
 *
 * @param {any} [preloadedState] 初始 state。 在同构应用中，你可以决定是否把服务端传来的
 * state 合成（hydrate）后传给它，或者从之前保存的用户会话中恢复一个传给它. 如果你使用
 * combineReducers 来创建 root reducer 函数,它必须是一个对象，并且需要和combinReducers
 * 的键保持一致.
 *
 * @param {Function} [enhancer] store enhancer. 可以使用第三方功能来增强 store，例如，
 * 中间件，时间旅行等等. 唯一内置于 Redux 中的 store enhancer 是 applyMiddleware().
 *
 * @returns {Store} 返回一个 Redux store，这可以让你读取 state tree，dispatch actions，
 * 以及对 store tree 的改变进行订阅(subscribe).
 */
export default function createStore(reducer, preloadedState, enhancer) {
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }

    return enhancer(createStore)(reducer, preloadedState)
  }

  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }

  let currentReducer = reducer
  let currentState = preloadedState
  let currentListeners = []
  let nextListeners = currentListeners
  let isDispatching = false

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice()
    }
  }

  /**
   * 读取由 store 管理的 state tree.
   *
   * @returns {any} 当前的 state tree.
   */
  function getState() {
    if (isDispatching) {
      throw new Error(
        'You may not call store.getState() while the reducer is executing. ' +
          'The reducer has already received the state as an argument. ' +
          'Pass it down from the top reducer instead of reading it from the store.'
      )
    }

    return currentState
  }

  /**
   * 添加一个订阅者. 每当 dispatch action 后通知(调用)所有的订阅者.
   * 此时 state tree 中的某些数据可能已经发生变化. 你可以在观察者的回调中调用 getState()
   * 来获取当前的 state tree.
   *
   * 你可能会在观察者中调用 dispatch()，此时请注意：
   *
   * 1. 在调用 dispatch() 之前会保存一份订阅者列表的快照.
   * 当你在订阅者被调用时进行 subscribe 或 unsubscribe，这对正在进行的 dispatch() 没有
   * 任何影响，但是，无论下一次的 dispatch() 是不是嵌套的，都将会使用最新的订阅者列表快照.
   *
   * 2. 订阅者不应该期望观察到 state 所有的变化，在订阅者被调用之前，往往由于嵌套的 dispatch()
   * 导致 state 发生多次的改变。保证所有的监听器都注册在 dispatch() 启动之前，这样，在
   * 调用监听器的时候就会传入监听器所存在时间里最新的一次 state.
   *
   * @param {Function} listener 每次 dispatch 时调用的回调函数.
   * @returns {Function} 用于清除此订阅者的函数.
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function.')
    }

    if (isDispatching) {
      throw new Error(
        'You may not call store.subscribe() while the reducer is executing. ' +
          'If you would like to be notified after the store has been updated, subscribe from a ' +
          'component and invoke store.getState() in the callback to access the latest state. ' +
          'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
      )
    }

    let isSubscribed = true

    ensureCanMutateNextListeners()
    nextListeners.push(listener)

    return function unsubscribe() {
      if (!isSubscribed) {
        return
      }

      if (isDispatching) {
        throw new Error(
          'You may not unsubscribe from a store listener while the reducer is executing. ' +
            'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
        )
      }

      isSubscribed = false

      ensureCanMutateNextListeners()
      const index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1)
    }
  }

  /**
   * 调用一个 action，这是改变 state tree 的唯一方式.
   *
   * 用于创建 store 的 reducer 函数被调用(参数为当前的 state tree 和给定的 action)，
   * 它的返回值被视为 **next** state tree，之后通知所有的订阅者.
   *
   * 通常情况下，只支持普通的对象类型的 action，如果你想 dispatch Promise、Obserable、
   * thunk 或者其他的东西，你需要把 store 创建函数包裹到相应的 middleware 中. 即使是
   * middleware，最终也是使用此方法来 dispatch 一个普通对象类型的 action.
   *
   * @param {Object} action 一个描述 '发生了什么' 的普通对象. action 必须拥有一个 type
   * 属性且不能为 undefined. 使用字符串常量来表示 action type 是一个很好的实践.
   *
   * @returns {Object} 为了方便使用，将 action 原封不动的返回.
   *
   * 注意，如果你使用了自定义的 middleware，它会包裹 dispatch()，而且可能会返回一些别的东西，
   * 例如 Promise...
   */
  function dispatch(action) {
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
          'Use custom middleware for async actions.'
      )
    }

    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    try {
      isDispatching = true
      currentState = currentReducer(currentState, action)
    } finally {
      isDispatching = false
    }

    const listeners = (currentListeners = nextListeners)
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      listener()
    }

    return action
  }

  /**
   * 替换 store 正在使用的 reducer 来计算 state.
   *
   * 以下情况可能会用到：
   *
   * 1. 代码拆分.
   * 2. 加载异步 reducer.
   * 3. 热重载.
   *
   * @param {Function} nextReducer 要被 store 替换执行的 reducer.
   * @returns {void}
   */
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }

    currentReducer = nextReducer
    dispatch({ type: ActionTypes.REPLACE })
  }

  /**
   * 可观察/可反应 库的交互点
   *
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */
  function observable() {
    const outerSubscribe = subscribe
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        const unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    }
  }

  // 当 store 被创建之后，会 dispatch "INIT" action，这样每个 reducer 都会返回它们的默认
  // state. 这可以有效的填充初始 state tree.
  dispatch({ type: ActionTypes.INIT })

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
