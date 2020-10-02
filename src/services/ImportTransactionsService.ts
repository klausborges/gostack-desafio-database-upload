import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { getRepository, getCustomRepository, In } from 'typeorm';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  csvFilename: string;
}

interface TransactionDTO {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute({ csvFilename }: Request): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    // Parse the CSV file
    const csvFile = path.resolve(__dirname, '..', '..', 'tmp', csvFilename);
    const readCSVStream = fs.createReadStream(csvFile);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const parsedTransactions: TransactionDTO[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line;

      parsedTransactions.push({
        title,
        type,
        value,
        category,
      });
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    // Create non-existant categories before creating transactions
    const categories = parsedTransactions.map(
      transaction => transaction.category,
    );
    const uniqueCategories = Array.from(new Set(categories));

    const categoriesInRepository = await categoriesRepository.find({
      where: { title: In(uniqueCategories) },
    });
    const categoryTitlesInRepository = categoriesInRepository.map(
      category => category.title,
    );

    const categoriesToAdd = uniqueCategories
      .filter(category => !categoryTitlesInRepository.includes(category))
      .map(category => ({
        title: category,
      }));

    const addedCategories = categoriesRepository.create(categoriesToAdd);

    await categoriesRepository.save(addedCategories);

    const finalCategories = [...categoriesInRepository, ...addedCategories];

    const newTransactions = transactionsRepository.create(
      parsedTransactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category_id: finalCategories.find(
          category => category.title === transaction.category,
        )?.id,
      })),
    );

    await transactionsRepository.save(newTransactions);

    await fs.promises.unlink(csvFile);

    return newTransactions;
  }
}

export default ImportTransactionsService;
