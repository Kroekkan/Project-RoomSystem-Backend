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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

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

type UploadedImageFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@Controller('public-posts')
export class PublicPostsController {
  constructor(
    private readonly publicPostsService: PublicPostsService,
  ) {}

  // =========================
  // GET ALL
  // =========================
  @Get()
  findAll(@Query('category') category?: PostCategory) {
    return this.publicPostsService.findAll(category);
  }

  // =========================
  // GET ONE
  // =========================
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.publicPostsService.findOne(id);
  }

  // =========================
  // CREATE
  // =========================
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body() dto: CreatePublicPostDto,
    @UploadedFile() file: UploadedImageFile,
    @Req() req: RequestWithUser,
  ) {
    // ป้องกันกรณีที่ jwt เก็บเป็น id หรือ sub
    const userId = Number(req.user?.userId || (req.user as any)?.id || (req.user as any)?.sub);

    return this.publicPostsService.create(
      dto,
      userId,
      file,
    );
  }

  // =========================
  // UPDATE
  // =========================
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePublicPostDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = Number(
      req.user?.userId ||
      (req.user as any)?.id ||
      (req.user as any)?.sub
    );

    return this.publicPostsService.update(
      id,
      dto,
      userId,
      req.user.role === 'ADMIN',
    );
  }

  // =========================
  // DELETE
  // =========================
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = Number(
      req.user?.userId ||
      (req.user as any)?.id ||
      (req.user as any)?.sub
    );

    return this.publicPostsService.remove(
      id,
      userId,
      req.user.role === 'ADMIN',
    );
  }
}