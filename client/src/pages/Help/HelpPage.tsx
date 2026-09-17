import { useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  HelpCircle,
  Megaphone,
  Shield,
  Trash2,
  Upload,
  Bell,
  FileSpreadsheet,
  LogIn,
  Users,
  RotateCcw,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@client/src/components/ui/accordion';
import { Badge } from '@client/src/components/ui/badge';

interface HelpSection {
  id: string;
  title: string;
  icon: typeof HelpCircle;
  items: { q: string; a: string }[];
}

const sections: HelpSection[] = [
  {
    id: 'account',
    title: '账号与登录',
    icon: LogIn,
    items: [
      {
        q: '如何注册账号？',
        a: '在登录页面点击"注册账号"，输入用户名和密码即可注册。用户名需3~50位（含英文字母，不能纯数字）；密码需8~12位，可使用字母、数字、特殊字符任意组合。',
      },
      {
        q: '如何成为管理员？',
        a: '注册时将用户名设置为 admin，系统会自动将该账号设为管理员角色。注意：用户名必须精确为 admin（小写），其他用户名默认均为普通用户。',
      },
      {
        q: '什么是单点登录限制？',
        a: '同一账号同一时间只能在一台设备登录。当你在第二个设备登录时，第一个设备的会话会自动失效，需要重新登录。这是为了保护账号安全。',
      },
      {
        q: '如何修改密码？',
        a: '登录后，点击右上角用户头像/用户名，在下拉菜单中选择"修改密码"。需要先输入原密码，再输入两次新密码确认。新密码要求8~12位，可使用字母、数字、特殊字符任意组合。修改成功后所有设备的登录状态会失效，需重新登录。',
      },
      {
        q: '忘记密码怎么办？',
        a: '若仍能登录，请按上述方式自行修改密码；若无法登录，请联系管理员在管理后台为您重置密码。',
      },
    ],
  },
  {
    id: 'announcement',
    title: '公告通知',
    icon: Megaphone,
    items: [
      {
        q: '公告通知是什么？',
        a: '公告通知是管理员向全体教师发布通知和任务的模块。普通用户登录后点击左侧"公告通知"即可查看所有已发布的公告，公告按发布时间倒序排列，每页显示12条。',
      },
      {
        q: '普通公告和台账公告有什么区别？',
        a: '普通公告仅包含标题和正文，用于发布通知类信息（如放假安排、系统维护等）。台账公告（任务型公告）包含多条可勾选的任务条目，用户可以将需要的任务一键添加到自己的周台账或学期台账中，无需手动重复录入。',
      },
      {
        q: '如何将台账公告中的任务添加到自己的台账？',
        a: '点击公告进入详情页，勾选需要的任务条目（可多选），点击"添加到我的台账"按钮，在弹窗中选择目标台账文件夹，可重新设置预计完成时间、主要执行人和要求，最后点击"确认添加"即可。添加后任务会自动进入您选择的台账，状态默认为"未处理"。',
      },
      {
        q: '公告中的附件如何查看？',
        a: '如果公告包含附件（图片、Word或PDF文件），在公告详情页会显示附件下载链接，点击即可查看或下载。单个附件大小不超过2MB。',
      },
      {
        q: '管理员如何发布公告？',
        a: '管理员登录后，点击左侧"公告通知"，在页面右上角点击"公告管理"进入管理页面，点击"发布公告"按钮，选择公告类型（普通公告/台账公告），填写标题、内容、落款等信息后发布。台账公告可动态添加多条任务条目并设置截止日期。',
      },
      {
        q: '管理员可以编辑或删除公告吗？',
        a: '可以。在公告管理页面，每条公告右侧有查看、编辑和删除按钮。编辑可修改标题、内容、落款和任务条目；删除后公告将从所有用户的列表中移除。',
      },
    ],
  },
  {
    id: 'weekly',
    title: '周台账使用',
    icon: CalendarDays,
    items: [
      {
        q: '如何新建周台账？',
        a: '点击左侧导航"周台账" → 点击右上角"新建周台账" → 输入台账名称（如"第3周工作台账"）→ 点击"创建"。',
      },
      {
        q: '如何录入工作记录？',
        a: '进入台账详情页，在"新增记录"区域填写内容。默认有 5 条空白行，可点击"+"号增加更多行。每条记录包含：内容（必填）、预计完成时间、主要执行人、图片。填写完成后点击"提交记录"。',
      },
      {
        q: '可以只填部分行吗？',
        a: '可以。系统会自动跳过内容为空的行，只提交有内容的记录。',
      },
      {
        q: '如何上传图片？',
        a: '在每条录入行中点击"上传图片"按钮，选择本地图片（支持 JPG/PNG 格式），上传成功后会自动填入图片链接。提交记录时图片会随记录一起保存。',
      },
    ],
  },
  {
    id: 'semester',
    title: '学期台账使用',
    icon: GraduationCap,
    items: [
      {
        q: '学期台账和周台账有什么区别？',
        a: '学期台账用于记录整个学期的持续性工作，周台账用于记录每周的具体工作。两者功能完全一致，只是分类不同，数据互相独立。',
      },
      {
        q: '如何新建学期台账？',
        a: '点击左侧导航"学期台账" → 点击右上角"新建学期台账" → 输入名称（如"2025秋季学期工作台账"）→ 点击"创建"。',
      },
      {
        q: '学期台账可以录入多少条记录？',
        a: '没有上限。每次进入详情页都可以继续添加新的记录。',
      },
    ],
  },
  {
    id: 'progress',
    title: '进度与状态管理',
    icon: FileSpreadsheet,
    items: [
      {
        q: '如何更新进度状态？',
        a: '在台账详情页的记录列表中，找到要更新的记录，点击状态下拉框（待处理/进行中/已完成），选择新的状态即可立即更新。',
      },
      {
        q: '可以修改记录内容吗？',
        a: '目前支持更新进度状态和删除记录。内容和其他字段暂不支持编辑，如需修改请删除后重新录入。',
      },
      {
        q: '如何删除单条记录？',
        a: '在记录列表中找到对应记录，点击右侧的删除图标，确认后即可删除。删除后不可恢复。',
      },
    ],
  },
  {
    id: 'export',
    title: 'Excel 导出',
    icon: FileSpreadsheet,
    items: [
      {
        q: '如何导出台账？',
        a: '进入台账详情页，点击右上角的"导出 Excel"按钮，系统会生成 .xlsx 格式的 Excel 文件并自动下载。',
      },
      {
        q: '导出的文件包含哪些内容？',
        a: '导出文件包含以下列：序号、内容、主要执行人、预计完成时间、进度状态、图片链接、录入时间。所有记录按序号升序排列。',
      },
      {
        q: '导出格式是什么？',
        a: '.xlsx 格式（Excel 2007 及以上版本），可直接用 Microsoft Excel、WPS、Numbers 等软件打开。',
      },
    ],
  },
  {
    id: 'recycle',
    title: '回收站',
    icon: Trash2,
    items: [
      {
        q: '如何删除台账？',
        a: '在周台账或学期台账列表中，点击台账卡片上的"删除"按钮，台账会被移入回收站，不会立即永久删除。',
      },
      {
        q: '如何恢复已删除的台账？',
        a: '点击左侧导航"回收站"，找到要恢复的台账，点击"恢复"按钮，台账会恢复到原来的分类中。',
      },
      {
        q: '如何永久删除台账？',
        a: '在回收站中点击"永久删除"，台账及其所有记录将被彻底删除，不可恢复。请谨慎操作。',
      },
      {
        q: '回收站的台账会保留多久？',
        a: '回收站中的台账保留 14 天，14 天后会被系统自动清理（永久删除）。每次打开回收站页面时会自动触发清理。',
      },
    ],
  },
  {
    id: 'reminder',
    title: '提醒功能',
    icon: Bell,
    items: [
      {
        q: '什么时候会弹出提醒？',
        a: '登录后进入首页时，如果有待处理事项或即将到期事项，会自动弹出提醒窗口。',
      },
      {
        q: '即将到期是怎么判断的？',
        a: '预计完成时间在未来 2 天以内（含今天、明天）且状态不是"已完成"的记录，会被标记为"即将到期"。',
      },
      {
        q: '"不再提示"有什么用？',
        a: '点击某条提醒的"不再提示"后，这条记录的提醒会被关闭，以后的提醒弹窗中不会再出现这条。关闭后如需要重新提醒，请联系管理员。',
      },
      {
        q: '提醒弹窗可以关闭吗？',
        a: '可以。点击弹窗右上角的关闭按钮或点击"知道了"即可关闭。关闭后当天进入首页不会再弹出，重新登录后会再次检查。',
      },
    ],
  },
  {
    id: 'admin',
    title: '管理员功能',
    icon: Shield,
    items: [
      {
        q: '如何进入管理后台？',
        a: '使用 admin 账号登录后，右上角会显示"管理后台"按钮，点击即可进入。也可以在用户下拉菜单中找到"管理后台"入口。',
      },
      {
        q: '管理员能看到什么？',
        a: '管理员可以看到所有注册用户的列表（含台账数量统计），可以查看任意用户的所有台账和详细记录，也可以导出台账数据。',
      },
      {
        q: '如何清除用户数据？',
        a: '在管理后台的用户列表中，找到对应用户，点击"清除数据"按钮，确认后该用户的所有台账和记录将被永久删除。该操作不可恢复，请谨慎使用。',
      },
      {
        q: '管理员可以创建用户吗？',
        a: '不可以。用户需要自行注册账号。管理员只能查看和清除已有用户的数据。',
      },
    ],
  },
];

const HelpPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>(sections[0].id);

  const currentSection = sections.find((s) => s.id === activeSection);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">使用说明</h1>
        <p className="mt-1 text-sm text-gray-500">
          工作台账管理系统 — 常见问题与操作指南
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
        <div className="md:w-56 shrink-0 space-y-1 md:border-r md:border-gray-100 md:pr-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <section.icon className="h-4 w-4" />
              {section.title}
            </button>
          ))}
        </div>

        <div className="flex-1">
          {currentSection && (
            <Card className="border-gray-200 shadow-sm rounded-xl">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <currentSection.icon className="h-5 w-5 text-blue-600" />
                  {currentSection.title}
                </CardTitle>
                <CardDescription className="text-gray-500">
                  共 {currentSection.items.length} 个常见问题
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Accordion type="single" collapsible className="w-full">
                  {currentSection.items.map((item, index) => (
                    <AccordionItem
                      key={index}
                      value={`item-${index}`}
                      className="border-b border-gray-100"
                    >
                      <AccordionTrigger className="text-left text-sm font-medium text-gray-800 hover:text-gray-900 hover:no-underline">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-gray-600 leading-relaxed">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
