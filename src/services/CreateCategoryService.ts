import { getRepository } from 'typeorm';

import Category from '../models/Category';

interface Request {
  title: string;
}

class CreateCategoryService {
  public async execute({ title }: Request): Promise<Category> {
    const categoriesRepository = getRepository(Category);

    const category = await categoriesRepository.findOne({
      where: { title },
    });

    if (category) {
      return category;
    }

    const newCategory = categoriesRepository.create({ title });

    await categoriesRepository.save(newCategory);

    return newCategory;
  }
}

export default CreateCategoryService;
