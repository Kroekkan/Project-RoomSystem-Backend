import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublicPostDto } from './dto/create-public-post.dto';
import { UpdatePublicPostDto } from './dto/update-public-post.dto';
import { PostCategory } from '@prisma/client';

@Injectable()
export class PublicPostsService {
  constructor(private prisma: PrismaService) {}

  findAll(category?: PostCategory) {
    return this.prisma.publicPost.findMany({
      where: category ? { category } : undefined,
      include: {
        author: { select: { id: true, name: true, picture: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const post = await this.prisma.publicPost.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true, picture: true } } },
    });
    if (!post) throw new NotFoundException('ไม่พบประกาศนี้');
    return post;
  }

  create(dto: CreatePublicPostDto, authorId: number) {
    return this.prisma.publicPost.create({
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        authorId,
      },
      include: { author: { select: { id: true, name: true, picture: true } } },
    });
  }

  async update(id: number, dto: UpdatePublicPostDto, userId: number, isAdmin: boolean) {
    const post = await this.findOne(id);

    if (post.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขประกาศนี้');
    }

    return this.prisma.publicPost.update({
      where: { id },
      data: dto,
      include: { author: { select: { id: true, name: true, picture: true } } },
    });
  }

  async remove(id: number, userId: number, isAdmin: boolean) {
    const post = await this.findOne(id);

    if (post.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ลบประกาศนี้');
    }

    return this.prisma.publicPost.delete({ where: { id } });
  }
}