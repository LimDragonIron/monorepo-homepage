import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database/database.service';
import * as bcrypt from 'bcrypt';
import { UserDto } from './dto/user.dto';
import { User } from 'libs/types';

@Injectable()
export class UserService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createUser(createUser: UserDto): Promise<User> {
    const { name, email, password } = createUser;
    const hash = await bcrypt.hash(password, 10);
    const result = await this.databaseService.user.create({
      data: {
        name,
        email,
        password: hash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!result) {
      throw new Error('User creation failed');
    }

    return result;
  }

  async updateUserById(
    id: string,
    updateUser: Partial<UserDto>,
  ): Promise<User> {
    const { name, email, password, role } = updateUser;
    
    const data: any = {};
    
    if (name) {
      data.name = name;
    }
    if (email) {
      data.email = email;
    }
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    if(role) {
      data.role = role;
    }

    const result = await this.databaseService.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!result) {
      throw new Error('User update failed');
    }

    return result;
  }

  async deleteUser(id: string): Promise<User> {
    const result = await this.databaseService.user.delete({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!result) {
      throw new Error('User deletion failed');
    }

    return result;
  }
  async findUserById(id: string): Promise<User | null> {
    const result = await this.databaseService.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!result) {
      throw new Error('User not found');
    }

    return result;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const result = await this.databaseService.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true,
      },
    });

    if (!result) {
      return null;
    }

    return result;
  }

  async findAllUsers(): Promise<User[]> {
    const result = await this.databaseService.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!result) {
      throw new Error('No users found');
    }

    return result;
  }

  async comparePassword(password:string, hash:string): Promise<boolean> {
    const result = await bcrypt.compare(password, hash);
    if (!result) {
      throw new Error('Password comparison failed');
    }
    return true;
  }

}
