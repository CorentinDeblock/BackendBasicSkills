import { test, expect } from "@jest/globals";
import * as _ from "lodash";

// Currying function via native implementation
// Specifying return type as any to avoid type errors on the filter method
// Fixing the return type is not easy so we avoid it for this example
function curry<T extends any[]>(fn: (...args: T) => any) {
    return function curried(...args: any[]) {
        if (args.length >= fn.length) {
            return fn(...(args as T));
        }

        return (...moreArgs: any[]) => curried(...args, ...moreArgs);
    };
}

function hasElementToCurry(elements: string[], array: string[]) {
    // Check if the elements array contains any of the elements in the array
    for (const element of elements) {
        if (array.includes(element)) {
            return true;
        }
    }

    return false;
}

test("Simple curry function", () => {
    // Currying function via lodash
    const hasElement = _.curry(hasElementToCurry);

    // Currying function via native implementation
    const hasElementNative = curry(hasElementToCurry);

    // Sample array of data
    const testArray = ["banana", "apple", "grape", "watermelon", "orange"];

    // Testing the curried function
    expect(testArray.filter(hasElement(["banana", "grape"]))).toEqual([
        "banana",
        "grape",
    ]);

    // Testing the native curried function
    expect(testArray.filter(hasElementNative(["banana", "grape"]))).toEqual([
        "banana",
        "grape",
    ]);
});
