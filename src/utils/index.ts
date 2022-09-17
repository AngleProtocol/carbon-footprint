import { utils } from 'ethers';
import { NextFunction, Request, Response } from 'express';
import joi, { SchemaMap } from 'joi';

export function validateParams(schema: SchemaMap, segment: 'query' | 'body' = 'body') {
  if (!schema) throw new Error('invalid schema');

  return function (req: Request, res: Response, next: NextFunction) {
    try {
      const { value, error } = joi.object(schema).validate(req[segment]);
      res.locals.inputs = value;
      if (!error) return next();
      res.status(400).json({ details: error, error: 'invalid params' });
    } catch (e) {
      console.log('validateParams error');
      throw e;
    }
  };
}

const customJoi = joi.extend({
  base: joi.string(),
  messages: {
    'address.format': '{{#label}} must be a valid address',
  },
  type: 'address',
  validate(value, helpers) {
    if (utils.isAddress(value)) return { value: utils.getAddress(value) };
    return { errors: helpers.error('address.format'), value };
  },
});

export const joiAddressValidator: joi.Root['any'] = () => customJoi.address();
