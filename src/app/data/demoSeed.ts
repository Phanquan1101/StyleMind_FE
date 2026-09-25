import type { DemoDatabase } from '@/app/store/types'
import { DEMO_ADMIN, DEMO_CUSTOMER } from '@/shared/constants/demoAccounts'

const PRODUCT_IMAGE_BASE = 'https://images.unsplash.com'

export function createDemoSeed(): DemoDatabase {
  return {
    schemaVersion: 1,
    users: [
      {
        id: 'usr-customer-01',
        role: 'customer',
        status: 'active',
        fullName: 'Nguyễn Thiên An',
        email: DEMO_CUSTOMER.email,
        password: DEMO_CUSTOMER.password,
        phone: '0912345678',
        avatarInitials: 'TA',
        createdAt: '2026-09-01T08:00:00.000Z',
      },
      {
        id: 'usr-admin-01',
        role: 'admin',
        status: 'active',
        fullName: 'Trần Minh Quân',
        email: DEMO_ADMIN.email,
        password: DEMO_ADMIN.password,
        phone: '0987654321',
        avatarInitials: 'MQ',
        createdAt: '2026-09-01T08:15:00.000Z',
      },
    ],
    session: null,
    categories: [
      { id: 'tops', label: 'Áo', description: 'Áo sơ mi, áo blouse và áo dệt kim.', active: true, order: 1 },
      { id: 'bottoms', label: 'Quần', description: 'Quần âu, quần ống rộng và denim.', active: true, order: 2 },
      { id: 'skirts', label: 'Chân váy', description: 'Chân váy midi và chân váy công sở.', active: true, order: 3 },
      { id: 'dresses', label: 'Đầm', description: 'Đầm liền cho công sở và buổi tối.', active: true, order: 4 },
      { id: 'outerwear', label: 'Áo khoác', description: 'Blazer, áo khoác nhẹ và áo măng tô.', active: true, order: 5 },
    ],
    products: [
      {
        id: 'prd-blouse-01',
        categoryId: 'tops',
        name: 'Áo blouse cổ vuông',
        brand: 'Lam Trà',
        description: 'Áo blouse chất cotton pha modal, cổ vuông mềm và tay phồng nhẹ cho ngày đi làm.',
        basePrice: 620000,
        material: 'Cotton modal',
        fit: 'Dáng vừa',
        pattern: 'Trơn',
        styleIds: ['minimal', 'feminine'],
        occasionIds: ['work', 'weekend'],
        tags: ['áo blouse', 'đi làm', 'tối giản', 'nữ tính'],
        featured: true,
        active: true,
        createdAt: '2026-09-10T09:00:00.000Z',
        variants: [
          {
            id: 'var-blouse-white-m',
            color: 'Trắng',
            colorHex: '#F8F4EF',
            size: 'M',
            stock: 8,
            active: true,
            images: [
              {
                id: 'img-blouse-white-01',
                url: `${PRODUCT_IMAGE_BASE}/photo-1629511565591-a1d494ad6c58?w=900&h=1200&fit=crop&auto=format`,
                alt: 'Áo blouse cổ vuông màu trắng trên nền sáng',
                isPrimary: true,
                order: 1,
              },
            ],
          },
          {
            id: 'var-blouse-black-m',
            color: 'Đen',
            colorHex: '#242124',
            size: 'M',
            stock: 5,
            active: true,
            images: [
              {
                id: 'img-blouse-black-01',
                url: `${PRODUCT_IMAGE_BASE}/photo-1594633312681-425c7b97ccd1?w=900&h=1200&fit=crop&auto=format`,
                alt: 'Áo blouse cổ vuông màu đen phối cùng quần sáng màu',
                isPrimary: true,
                order: 1,
              },
            ],
          },
          {
            id: 'var-blouse-black-xl',
            color: 'Đen',
            colorHex: '#242124',
            size: 'XL',
            stock: 0,
            active: true,
            images: [
              {
                id: 'img-blouse-black-02',
                url: `${PRODUCT_IMAGE_BASE}/photo-1594633312681-425c7b97ccd1?w=900&h=1200&fit=crop&auto=format`,
                alt: 'Áo blouse cổ vuông màu đen cận chất liệu',
                isPrimary: true,
                order: 1,
              },
            ],
          },
        ],
      },
    ],
    cartLines: [],
    addresses: [
      {
        id: 'adr-customer-home',
        userId: 'usr-customer-01',
        recipientName: 'Nguyễn Thiên An',
        phone: '0912345678',
        line1: '72 Nguyễn Thị Minh Khai',
        ward: 'Phường Võ Thị Sáu',
        district: 'Quận 3',
        province: 'TP. Hồ Chí Minh',
        isDefault: true,
      },
      {
        id: 'adr-customer-office',
        userId: 'usr-customer-01',
        recipientName: 'Nguyễn Thiên An',
        phone: '0912345678',
        line1: '18 Lê Thánh Tôn',
        ward: 'Phường Bến Nghé',
        district: 'Quận 1',
        province: 'TP. Hồ Chí Minh',
        isDefault: false,
      },
    ],
    orders: [],
    notifications: [
      {
        id: 'noti-welcome-01',
        userId: 'usr-customer-01',
        type: 'system',
        title: 'Dữ liệu demo đã sẵn sàng',
        body: 'Bạn có thể thử đăng nhập, mua sắm và thanh toán bằng dữ liệu mẫu.',
        read: false,
        createdAt: '2026-09-25T06:00:00.000Z',
        link: '/shop',
      },
    ],
    cancellationRequests: [],
    returnRequests: [],
    fashionMetadata: {
      styles: [
        { id: 'minimal', label: 'Tối giản', active: true },
        { id: 'feminine', label: 'Nữ tính', active: true },
      ],
      occasions: [
        { id: 'work', label: 'Đi làm', active: true },
        { id: 'weekend', label: 'Cuối tuần', active: true },
      ],
      colors: [
        { id: 'white', label: 'Trắng', active: true },
        { id: 'black', label: 'Đen', active: true },
      ],
      materials: [{ id: 'cotton-modal', label: 'Cotton modal', active: true }],
      fits: [{ id: 'regular', label: 'Dáng vừa', active: true }],
      patterns: [{ id: 'solid', label: 'Trơn', active: true }],
    },
    compatibilityRules: [],
    aiMetrics: {
      wardrobeCount: 18,
      generatedOutfits: 42,
      aiAddedToCart: 7,
      aiOrderCount: 3,
      popularStyles: [{ styleId: 'minimal', count: 24 }],
    },
  }
}
