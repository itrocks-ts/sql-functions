
export class SqlFunction
{
	constructor(public name: string, public sql: string, public value: any) {}
}

export const equal          = (value: any) => new SqlFunction(equal.name,          ' = ?',    value)
export const greater        = (value: any) => new SqlFunction(greater.name,        ' > ?',    value)
export const greaterOrEqual = (value: any) => new SqlFunction(greaterOrEqual.name, ' >= ?',   value)
export const less           = (value: any) => new SqlFunction(less.name,           ' < ?',    value)
export const lessOrEqual    = (value: any) => new SqlFunction(lessOrEqual.name,    ' <= ?',   value)
export const like           = (value: any) => new SqlFunction(like.name,           ' LIKE ?', value)
