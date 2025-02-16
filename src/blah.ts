/**
 * You're an expert TypeScript programmer
 * For a given list of integers, return a tuple consisting of a sum and a product of all the integers in a list.
 * Empty sum should be equal to 0 and empty product should be equal to 1.
 * >>> sum_product([])
 * (0, 1)
 * >>> sum_product([1, 2, 3, 4])
 * (10, 24)
 * 
 */
const sum_product = function (numbers: Array<number>) : Array<number>  {
    let sum = 0;
    let product = 1;
  
    for (const number of numbers) {
      sum += number;
      product *= number;
    }
  
    return [sum, product];
  };

import * as assert from 'assert'

let actual_1 = sum_product([]);
let expected_1 = [0, 1];
assert.deepEqual(actual_1, expected_1, "Exception --- test case 0 failed to pass");

let actual_2 = sum_product([1, 1, 1]);
let expected_2 = [3, 1];
assert.deepEqual(actual_2, expected_2, "Exception --- test case 1 failed to pass");

let actual_3 = sum_product([100, 0]);
let expected_3 = [100, 0];
assert.deepEqual(actual_3, expected_3, "Exception --- test case 2 failed to pass");

let actual_4 = sum_product([3, 5, 7]);
let expected_4 = [15, 105];
assert.deepEqual(actual_4, expected_4, "Exception --- test case 3 failed to pass");

let actual_5 = sum_product([10]);
let expected_5 = [10, 10];
assert.deepEqual(actual_5, expected_5, "Exception --- test case 4 failed to pass");
