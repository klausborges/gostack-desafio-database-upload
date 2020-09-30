import { getCustomRepository } from 'typeorm';
// import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';

import CreateCategoryService from './CreateCategoryService';

import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const balance = await transactionsRepository.getBalance();
    if (type === 'outcome' && balance.total - value < 0) {
      throw new AppError('Insufficient funds in account balance');
    }

    const createCategory = new CreateCategoryService();

    const categoryReference = await createCategory.execute({ title: category });

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryReference.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
