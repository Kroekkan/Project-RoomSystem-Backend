import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublicPostDto } from './dto/create-public-post.dto';
import { UpdatePublicPostDto } from './dto/update-public-post.dto';
import { PostCategory } from '@prisma/client';
import {
  createClient,
  SupabaseClient,
} from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

type UploadedImageFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class PublicPostsService {
  private readonly supabase: SupabaseClient;
  private readonly bucket = 'images';

  constructor(
    private readonly prisma: PrismaService,
  ) {
    const supabaseUrl = process.env.SUPABASE_URL;

    const supabaseServiceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error(
        'SUPABASE_URL is not configured',
      );
    }

    if (!supabaseServiceRoleKey) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY is not configured',
      );
    }

    this.supabase = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
    );
  }

  // =========================
  // GET ALL POSTS
  // =========================
  findAll(category?: PostCategory) {
    return this.prisma.publicPost.findMany({
      where: category
        ? { category }
        : undefined,

      include: {
        author: {
          select: {
            id: true,
            name: true,
            picture: true,
          },
        },

        room: {
          select: {
            id: true,
            name: true,
            building: true,
            category: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // =========================
  // GET ONE POST
  // =========================
  async findOne(id: number) {
    const post =
      await this.prisma.publicPost.findUnique({
        where: {
          id,
        },

        include: {
          author: {
            select: {
              id: true,
              name: true,
              picture: true,
            },
          },

          room: {
            select: {
              id: true,
              name: true,
              building: true,
              category: true,
            },
          },
        },
      });

    if (!post) {
      throw new NotFoundException(
        'ไม่พบประกาศนี้',
      );
    }

    return post;
  }

  // =========================
  // UPLOAD IMAGE TO SUPABASE
  // =========================
  private async uploadImage(
    file: UploadedImageFile,
  ): Promise<string> {
    if (!file) {
      throw new InternalServerErrorException(
        'ไม่พบไฟล์รูปภาพ',
      );
    }

    // ตรวจสอบว่าเป็นรูปภาพ
    if (!file.mimetype.startsWith('image/')) {
      throw new InternalServerErrorException(
        'ไฟล์ที่อัปโหลดต้องเป็นรูปภาพเท่านั้น',
      );
    }

    // จำกัดขนาด 5MB
    if (file.size > 5 * 1024 * 1024) {
      throw new InternalServerErrorException(
        'รูปภาพต้องมีขนาดไม่เกิน 5MB',
      );
    }

    // นามสกุลไฟล์
    const originalName =
      file.originalname || '';

    const extension =
      originalName.includes('.')
        ? originalName
            .split('.')
            .pop()
            ?.toLowerCase()
        : 'jpg';

    const fileExtension =
      extension || 'jpg';

    // สร้างชื่อไฟล์ใหม่
    const fileName =
      `${randomUUID()}.${fileExtension}`;

    // เก็บไว้ในโฟลเดอร์ public-posts
    const filePath =
      `public-posts/${fileName}`;

    // Upload ไป Supabase Storage
    const { error } =
      await this.supabase.storage
        .from(this.bucket)
        .upload(
          filePath,
          file.buffer,
          {
            contentType:
              file.mimetype,
            upsert: false,
          },
        );

    if (error) {
      console.error(
        'Supabase upload error:',
        error,
      );

      throw new InternalServerErrorException(
        `อัปโหลดรูปไม่สำเร็จ: ${error.message}`,
      );
    }

    // ดึง Public URL
    const { data } =
      this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      throw new InternalServerErrorException(
        'ไม่สามารถสร้าง URL ของรูปภาพได้',
      );
    }

    return data.publicUrl;
  }

  // =========================
  // CREATE POST
  // =========================
  async create(
    dto: CreatePublicPostDto,
    authorId: number,
    file?: UploadedImageFile,
  ) {
    let imageUrl: string | null = null;

    // ถ้ามีรูป → Upload Supabase
    if (file) {
      imageUrl =
        await this.uploadImage(file);
    }

    const post =
      await this.prisma.publicPost.create({
        data: {
          category: dto.category,

          title: dto.title,

          message: dto.message,

          location:
            dto.location || null,

          // 🟢 ทุกหมวดสามารถผูกกับห้องได้
          roomId:
            dto.roomId ? Number(dto.roomId) : null,

          imageUrl,

          startDate:
            dto.startDate
              ? new Date(dto.startDate)
              : null,

          endDate:
            dto.endDate
              ? new Date(dto.endDate)
              : null,

          authorId,
        },

        include: {
          author: {
            select: {
              id: true,
              name: true,
              picture: true,
            },
          },

          // 🟢 ส่งข้อมูลห้องกลับไปครบ
          room: {
            select: {
              id: true,
              name: true,
              building: true,
              category: true,
            },
          },
        },
      });

    return post;
  }

  // =========================
  // UPDATE POST
  // =========================
  async update(
    id: number,
    dto: UpdatePublicPostDto,
    userId: number,
    isAdmin: boolean,
  ) {
    const post =
      await this.findOne(id);

    if (
      post.authorId !== userId &&
      !isAdmin
    ) {
      throw new ForbiddenException(
        'คุณไม่มีสิทธิ์แก้ไขประกาศนี้',
      );
    }

    return this.prisma.publicPost.update({
      where: {
        id,
      },

      data: dto,

      include: {
        author: {
          select: {
            id: true,
            name: true,
            picture: true,
          },
        },

        // 🟢 ส่งข้อมูลห้องกลับไปครบ
        room: {
          select: {
            id: true,
            name: true,
            building: true,
            category: true,
          },
        },
      },
    });
  }

  // =========================
  // DELETE POST
  // =========================
  async remove(
    id: number,
    userId: number,
    isAdmin: boolean,
  ) {
    const post =
      await this.findOne(id);

    if (
      post.authorId !== userId &&
      !isAdmin
    ) {
      throw new ForbiddenException(
        'คุณไม่มีสิทธิ์ลบประกาศนี้',
      );
    }

    // ถ้ามีรูปใน Supabase
    // ลบรูปออกจาก Storage ด้วย
    if (post.imageUrl) {
      try {
        const imageUrl =
          post.imageUrl;

        const marker =
          '/storage/v1/object/public/images/';

        const index =
          imageUrl.indexOf(marker);

        if (index !== -1) {
          const filePath =
            imageUrl.substring(
              index + marker.length,
            );

          await this.supabase.storage
            .from(this.bucket)
            .remove([filePath]);
        }
      } catch (error) {
        console.error(
          'Supabase image delete error:',
          error,
        );

        // ไม่ให้การลบรูปทำให้
        // ลบประกาศไม่ได้
      }
    }

    return this.prisma.publicPost.delete({
      where: {
        id,
      },
    });
  }
}