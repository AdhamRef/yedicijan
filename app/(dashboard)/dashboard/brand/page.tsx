"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast, Toaster } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Trash2, GripVertical, Plus, Star, Edit2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type WorkingHours = {
  day: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

type FooterContent = {
  id: string;
  companyName: string;
  logo: string;
  slogan?: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  whatsapp: string;
  hasYoutube: boolean;
  youtubeLink: string;
  youtubeCount: number;
  hasInstagram: boolean;
  instagramLink: string;
  instagramCount: number;
  hasFacebook: boolean;
  facebookLink: string;
  facebookCount: number;
  hasTwitter: boolean;
  twitterLink: string;
  twitterCount: number;
  hasLinkedin: boolean;
  linkedinLink: string;
  linkedinCount: number;
  hasTiktok: boolean;
  tiktokLink: string;
  tiktokCount: number;
  workingHours: WorkingHours[];
  location?: {
    lat: number;
    lng: number;
  };
};

type Testimonial = {
  id: string;
  quote: string;
  author: string;
  role: string;
  image: string;
  rating: number;
  featured: boolean;
  order: number;
};

interface ExtendedFooterContent extends FooterContent {
  testimonials?: Testimonial[];
}

export default function BrandPage() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [footerId, setFooterId] = useState<string>("");
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [initialLocation, setInitialLocation] = useState<string>("");
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FooterContent & { googleMapsUrl?: string }>();
  
  const days = [
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
    "الأحد"
  ];

  const socialPlatforms = [
    { key: "Youtube", label: "يوتيوب" },
    { key: "Instagram", label: "انستغرام" },
    { key: "Facebook", label: "فيسبوك" },
    { key: "Twitter", label: "تويتر" },
    { key: "Linkedin", label: "لينكد إن" },
    { key: "Tiktok", label: "تيك توك" }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [footerResponse, testimonialsResponse] = await Promise.all([
          fetch("/api/footer"),
          fetch("/api/testimonials")
        ]);
        
        if (!footerResponse.ok || !testimonialsResponse.ok) 
          throw new Error("Failed to fetch");
        
        const footerData = await footerResponse.json();
        const testimonialsData = await testimonialsResponse.json();
        
        if (footerData) {
          setFooterId(footerData.id);
          if (footerData.location?.lat && footerData.location?.lng) {
            setInitialLocation(`${footerData.location.lat}, ${footerData.location.lng}`);
          }
          Object.keys(footerData).forEach((key) => {
            setValue(key as keyof FooterContent, footerData[key]);
          });
        }
        
        setTestimonials(testimonialsData.sort((a: Testimonial, b: Testimonial) => a.order - b.order));
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("حدث خطأ أثناء تحميل البيانات");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchData();
  }, [setValue]);

  const onSubmit = async (data: FooterContent & { googleMapsUrl?: string }) => {
    try {
      setLoading(true);
      
      const formattedData = {
        ...data,
        youtubeCount: Number(data.youtubeCount) || 0,
        instagramCount: Number(data.instagramCount) || 0,
        facebookCount: Number(data.facebookCount) || 0,
        twitterCount: Number(data.twitterCount) || 0,
        linkedinCount: Number(data.linkedinCount) || 0,
        tiktokCount: Number(data.tiktokCount) || 0,
        googleMapsUrl: data.googleMapsUrl || undefined
      };

      const response = await fetch(`/api/footer`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) throw new Error("Failed to update");

      toast.success("تم حفظ التغييرات بنجاح! 🎉", {
        duration: 3000,
        position: "top-center",
        style: {
          background: '#10B981',
          color: '#fff',
          direction: 'rtl'
        },
      });
    } catch (error) {
      console.error("Error updating footer content:", error);
      toast.error("عذراً، حدث خطأ أثناء حفظ البيانات", {
        duration: 3000,
        position: "top-center",
        style: {
          background: '#EF4444',
          color: '#fff',
          direction: 'rtl'
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(testimonials);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order numbers
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    setTestimonials(updatedItems);

    try {
      const response = await fetch('/api/testimonials/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testimonials: updatedItems }),
      });

      if (!response.ok) throw new Error('Failed to update order');
    } catch (error) {
      toast.error('فشل تحديث الترتيب');
    }
  };

  const addTestimonial = async () => {
    try {
      const response = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote: "أضف رأي العميل هنا",
          author: "اسم العميل",
          role: "المسمى الوظيفي",
          image: "https://randomuser.me/api/portraits/men/1.jpg",
          rating: 5
        })
      });

      if (!response.ok) throw new Error('Failed to add testimonial');
      
      const newTestimonial = await response.json();
      setTestimonials(prev => [...prev, newTestimonial]);
      toast.success('تمت إضافة رأي العميل بنجاح');
    } catch (error) {
      toast.error('فشل في إضافة رأي العميل');
    }
  };

  const deleteTestimonial = async (id: string) => {
    try {
      const response = await fetch(`/api/testimonials/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete testimonial');
      
      setTestimonials(prev => prev.filter(t => t.id !== id));
      toast.success('تم حذف رأي العميل بنجاح');
    } catch (error) {
      toast.error('فشل في حذف رأي العميل');
    }
  };

  const toggleFeatured = async (id: string, featured: boolean) => {
    try {
      const response = await fetch(`/api/testimonials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured })
      });

      if (!response.ok) throw new Error('Failed to update testimonial');
      
      setTestimonials(prev => 
        prev.map(t => t.id === id ? { ...t, featured } : t)
      );
      toast.success('تم تحديث حالة رأي العميل بنجاح');
    } catch (error) {
      toast.error('فشل في تحديث حالة رأي العميل');
    }
  };

  const editTestimonial = async (id: string, data: Partial<Testimonial>) => {
    try {
      const response = await fetch(`/api/testimonials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to update testimonial');
      
      const updatedTestimonial = await response.json();
      setTestimonials(prev => 
        prev.map(t => t.id === id ? { ...t, ...updatedTestimonial } : t)
      );
      setIsEditDialogOpen(false);
      toast.success('تم تحديث رأي العميل بنجاح');
    } catch (error) {
      toast.error('فشل في تحديث رأي العميل');
    }
  };

  const EditTestimonialDialog = ({ testimonial }: { testimonial: Testimonial }) => {
    const [formData, setFormData] = useState(testimonial);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      editTestimonial(testimonial.id, formData);
    };

    return (
      <DialogContent className="sm:max-w-[425px]" >
        <DialogHeader>
          <DialogTitle>تعديل رأي العميل</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">صورة العميل</label>
            <input
              type="text"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الرأي</label>
            <textarea
              value={formData.quote}
              onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">اسم العميل</label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">المسمى الوظيفي</label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">التقييم</label>
            <input
              type="number"
              min="1"
              max="5"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setIsEditDialogOpen(false)}
              className="px-4 py-2 text-gray-500 hover:text-gray-700"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#025EB8] text-white rounded hover:bg-[#014fa0]"
            >
              حفظ التغييرات
            </button>
          </div>
        </form>
      </DialogContent>
    );
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8" >
      <Toaster />
      
      <h1 className="text-2xl font-bold mb-6 text-gray-800">إعدادات العلامة التجارية</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Information */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">معلومات الشركة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-gray-600">اسم الشركة</label>
              <input
                {...register("companyName", { required: "هذا الحقل مطلوب" })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-[#025EB8] focus:border-transparent"
              />
              {errors.companyName && (
                <span className="text-red-500 text-sm">{errors.companyName.message}</span>
              )}
            </div>
            <div>
              <label className="block mb-2 text-gray-600">رابط الشعار</label>
              <input
                {...register("logo")}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-[#025EB8] focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-2 text-gray-600">شعار الشركة</label>
              <input
                {...register("slogan")}
                placeholder="أدخل شعار الشركة هنا"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-[#025EB8] focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-2 text-gray-600">الوصف</label>
              <textarea
                {...register("description")}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-[#025EB8] focus:border-transparent"
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">معلومات الاتصال</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-gray-600">رقم الهاتف</label>
              <input
                {...register("phone")}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-[#025EB8] focus:border-transparent"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block mb-2 text-gray-600">البريد الإلكتروني</label>
              <input
                {...register("email")}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-[#025EB8] focus:border-transparent"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block mb-2 text-gray-600">واتساب</label>
              <input
                {...register("whatsapp")}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-[#025EB8] focus:border-transparent"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block mb-2 text-gray-600">العنوان</label>
              <input
                {...register("address")}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-[#025EB8] focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-2 text-gray-600">
                إحداثيات الموقع
                <span className="text-sm text-gray-500 mr-2">
                  (مثال: 41.0082, 28.9784)
                </span>
              </label>
              <input
                {...register("coordinates")}
                placeholder="41.0082, 28.9784"
                defaultValue={initialLocation}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-[#025EB8] focus:border-transparent"
                dir="ltr"
              />
              <p className="text-sm text-gray-500 mt-1">
                أدخل خط العرض وخط الطول مفصولين بفاصلة
              </p>
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">وسائل التواصل الاجتماعي</h2>
          {socialPlatforms.map(({ key, label }) => (
            <div key={key} className="mb-4 p-4 border rounded hover:border-blue-500 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  {...register(`has${key}` as keyof FooterContent)}
                  id={`has${key}`}
                  className="w-4 h-4 text-[#025EB8]"
                />
                <label htmlFor={`has${key}`} className="text-gray-700">{label}</label>
              </div>
              {watch(`has${key}` as keyof FooterContent) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-gray-600">الرابط</label>
                    <input
                      {...register(`${key.toLowerCase()}Link` as keyof FooterContent)}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-[#025EB8] focus:border-transparent"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-600">عدد المتابعين</label>
                    <input
                      type="number"
                      min="0"
                      {...register(`${key.toLowerCase()}Count` as keyof FooterContent, {
                        valueAsNumber: true,
                        setValueAs: (value) => Number(value) || 0
                      })}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-[#025EB8] focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Working Hours */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">ساعات العمل</h2>
          <div className="space-y-4">
            {days.map((day, index) => (
              <div key={day} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="font-medium text-gray-700">{day}</div>
                <input
                  type="time"
                  {...register(`workingHours.${index}.openTime`)}
                  className="p-2 border rounded focus:ring-2 focus:ring-[#025EB8] focus:border-transparent"
                />
                <input
                  type="time"
                  {...register(`workingHours.${index}.closeTime`)}
                  className="p-2 border rounded focus:ring-2 focus:ring-[#025EB8] focus:border-transparent"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register(`workingHours.${index}.isClosed`)}
                    id={`closed-${day}`}
                    className="w-4 h-4 text-[#025EB8]"
                  />
                  <label htmlFor={`closed-${day}`} className="text-gray-600">مغلق</label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto px-6 py-3 bg-[#025EB8] text-white rounded-lg hover:bg-[#014fa0] disabled:bg-[#025EB8]/50 transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
        </button>
      </form>

      {/* Testimonials Section */}
      <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow mt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-700">آراء العملاء</h2>
          <button
            onClick={addTestimonial}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة رأي جديد
          </button>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="testimonials">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {testimonials.map((testimonial, index) => (
                  <Draggable
                    key={testimonial.id}
                    draggableId={testimonial.id}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-gray-50 p-4 rounded-lg mb-4 hover:shadow-md transition-shadow ${
                          testimonial.featured ? 'border-2 border-[#025EB8]' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div {...provided.dragHandleProps} className="mt-2">
                            <GripVertical className="w-5 h-5 text-gray-400" />
                          </div>
                          
                          <img
                            src={testimonial.image}
                            alt={testimonial.author}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {[...Array(testimonial.rating)].map((_, i) => (
                                <Star
                                  key={i}
                                  className="w-4 h-4 text-yellow-400 fill-yellow-400"
                                />
                              ))}
                            </div>
                            <p className="text-gray-600 mb-2">{testimonial.quote}</p>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {testimonial.author}
                              </span>
                              <span className="text-[#025EB8]">
                                {testimonial.role}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                              <DialogTrigger asChild>
                                <button
                                  onClick={() => setEditingTestimonial(testimonial)}
                                  className="p-2 text-gray-600 hover:text-[#025EB8] transition-colors"
                                  title="تعديل"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </button>
                              </DialogTrigger>
                              {editingTestimonial && (
                                <EditTestimonialDialog testimonial={editingTestimonial} />
                              )}
                            </Dialog>
                            
                            <button
                              onClick={() => toggleFeatured(testimonial.id, !testimonial.featured)}
                              className={`p-2 rounded-full ${
                                testimonial.featured 
                                  ? 'bg-[#025EB8]/10 text-[#025EB8]' 
                                  : 'text-gray-400 hover:text-[#025EB8]'
                              }`}
                              title={testimonial.featured ? 'إلغاء التمييز' : 'تمييز'}
                            >
                              <Star className={`w-5 h-5 ${testimonial.featured ? 'fill-current' : ''}`} />
                            </button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                                  title="حذف"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent >
                                <AlertDialogHeader>
                                  <AlertDialogTitle>هل أنت متأكد من حذف هذا الرأي؟</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هذا الإجراء لا يمكن التراجع عنه. سيتم حذف رأي العميل نهائياً.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex gap-2">
                                  <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200">إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteTestimonial(testimonial.id)}
                                    className="bg-red-600 text-white hover:bg-red-700"
                                  >
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}
