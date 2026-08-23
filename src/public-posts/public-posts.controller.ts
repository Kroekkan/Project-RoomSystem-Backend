import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PublicPostsService } from './public-posts.service';
import { CreatePublicPostDto } from './dto/create-public-post.dto';
import { UpdatePublicPostDto } from './dto/update-public-post.dto';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { PostCategory } from '@prisma/client';

interface AuthenticatedUser {
  userId: number;
  email: string;
  role: string;
}

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Controller('public-posts')
export class PublicPostsController {
  constructor(private readonly publicPostsService: PublicPostsService) {}

  @Get()
  findAll(@Query('category') category?: PostCategory) {
    return this.publicPostsService.findAll(category);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.publicPostsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreatePublicPostDto, @Req() req: RequestWithUser) {
    return this.publicPostsService.create(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePublicPostDto,
    @Req() req: RequestWithUser,
  ) {
    return this.publicPostsService.update(id, dto, req.user.userId, req.user.role === 'ADMIN');
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.publicPostsService.remove(id, req.user.userId, req.user.role === 'ADMIN');
  }
}