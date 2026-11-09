import Link from "next/link";
import UsersManagement from "../_components/UsersManagement";

export default function DonorsUsersPage() {
  return (
    <div>
      <div className="flex justify-end px-4 pt-4 sm:px-6">
        <Link href="/dashboard/users/donors/lists" className="inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline focus-visible:outline-2">
          إدارة قوائم المتبرعين
        </Link>
      </div>
      <UsersManagement scope="donors" />
    </div>
  );
}
