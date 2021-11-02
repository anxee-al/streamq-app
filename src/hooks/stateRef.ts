import { isEqual } from 'lodash'
import React, { useCallback, useRef, useState } from 'react'

export const useStateRef = <T>(initialState: T): [T, any, { current: T }] => {
  const [state, setState] = useState<T>(initialState),
        ref = useRef(initialState)
  const set = useCallback(val => {
    ref.current = typeof val === 'function' ? val(ref.current) : val
    setState((prev: T) => isEqual(prev, ref.current) ? prev : ref.current)
  }, [])
  return [state, set, ref]
}