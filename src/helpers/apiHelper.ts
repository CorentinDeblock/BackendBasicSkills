type IDQuery<T> = { id: string} & T
type Body<T> = Omit<T, 'id'>

export { IDQuery, Body };